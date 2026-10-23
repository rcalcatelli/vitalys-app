import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../api/http";
import * as turnosApi from "../api/turnosApi";
import { renderWithRouter } from "../test/renderWithRouter";
import { unTurnoGym, unaFranjaGym } from "../test/turnoFixture";
import type { Turno } from "../types/turno";
import { IngresoPage } from "./IngresoPage";

vi.mock("../api/turnosApi", () => ({
  cupoGym: vi.fn(),
  listarTurnos: vi.fn(),
  marcarCompletado: vi.fn(),
}));

const DIA = "2026-10-26";

function turno(
  id: number,
  nombre: string,
  apellido: string,
  dni: string,
  extra: Partial<Turno> = {},
) {
  return unTurnoGym({
    id,
    personaNombre: nombre,
    personaApellido: apellido,
    personaDni: dni,
    inicio: `${DIA}T10:00:00-03:00`,
    fin: `${DIA}T11:00:00-03:00`,
    ...extra,
  });
}

const TURNOS = [
  turno(1, "Agustín", "Ríos", "42567001"),
  turno(2, "Micaela", "Acosta", "40782236"),
  turno(3, "Lucía", "Rojas", "40311852", {
    estado: "COMPLETADO",
    completadoEn: `${DIA}T10:01:00-03:00`,
  }),
  turno(4, "Nadie", "Cancelado", "1", { estado: "CANCELADO_EN_TIEMPO" }),
  turno(5, "Otra", "Franja", "2", {
    inicio: `${DIA}T11:00:00-03:00`,
    fin: `${DIA}T12:00:00-03:00`,
  }),
];

function a(hhmm: string) {
  return new Date(`${DIA}T${hhmm}:00-03:00`);
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(a("10:20"));
  vi.mocked(turnosApi.cupoGym).mockResolvedValue([
    unaFranjaGym(DIA, 9),
    unaFranjaGym(DIA, 10),
    unaFranjaGym(DIA, 11),
  ]);
  vi.mocked(turnosApi.listarTurnos).mockResolvedValue(TURNOS);
});
afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("IngresoPage", () => {
  it("PI-126 muestra la franja en curso con su progreso y a los pendientes primero", async () => {
    renderWithRouter(<IngresoPage />);

    expect(await screen.findByText("1 de 3 ingresaron")).toBeInTheDocument();
    expect(screen.getByText("10:00 – 11:00")).toBeInTheDocument();
    expect(turnosApi.cupoGym).toHaveBeenCalledWith(DIA);
    expect(turnosApi.listarTurnos).toHaveBeenCalledWith({ tipo: "GYM", fecha: DIA });

    const filas = screen.getAllByRole("listitem");
    expect(filas).toHaveLength(3);
    expect(within(filas[0]).getByText("Agustín Ríos")).toBeInTheDocument();
    expect(within(filas[1]).getByText("Micaela Acosta")).toBeInTheDocument();
    expect(within(filas[2]).getByText("Lucía Rojas")).toBeInTheDocument();
    expect(within(filas[2]).getByText("10:01")).toBeInTheDocument();
    expect(screen.queryByText("Otra Franja")).not.toBeInTheDocument();
    expect(screen.queryByText(/Deshacer/)).not.toBeInTheDocument();
  });

  it("filtra por nombre o por DNI parcial", async () => {
    renderWithRouter(<IngresoPage />);
    await screen.findByText("1 de 3 ingresaron");

    const buscador = screen.getByLabelText("Buscar por nombre o DNI");
    await userEvent.type(buscador, "4078");
    expect(screen.getByText("Micaela Acosta")).toBeInTheDocument();
    expect(screen.queryByText("Agustín Ríos")).not.toBeInTheDocument();

    await userEvent.clear(buscador);
    await userEvent.type(buscador, "zzz");
    expect(screen.getByText("Nadie coincide con la búsqueda.")).toBeInTheDocument();
  });

  it("marca el ingreso con la hora real, avisa con un toast y actualiza el progreso", async () => {
    vi.mocked(turnosApi.marcarCompletado).mockResolvedValue({
      ...TURNOS[0],
      estado: "COMPLETADO",
      completadoEn: `${DIA}T10:20:00-03:00`,
    });
    renderWithRouter(<IngresoPage />);
    await screen.findByText("1 de 3 ingresaron");

    await userEvent.click(
      within(screen.getAllByRole("listitem")[0]).getByRole("button", { name: "Marcar ingreso" }),
    );

    expect(await screen.findByText("2 de 3 ingresaron")).toBeInTheDocument();
    expect(turnosApi.marcarCompletado).toHaveBeenCalledWith(1);
    expect(screen.getByRole("status")).toHaveTextContent("Agustín Ríos ingresó al gimnasio");
    expect(screen.getByText("10:20")).toBeInTheDocument();
  });

  it("si el servidor rechaza el ingreso (ventana de check-in), lo dice y no cambia nada", async () => {
    vi.mocked(turnosApi.marcarCompletado).mockRejectedValue(
      new ApiError(422, "Todavía no se puede marcar el ingreso"),
    );
    renderWithRouter(<IngresoPage />);
    await screen.findByText("1 de 3 ingresaron");

    await userEvent.click(
      within(screen.getAllByRole("listitem")[0]).getByRole("button", { name: "Marcar ingreso" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Todavía no se puede marcar el ingreso",
    );
    expect(screen.getByText("1 de 3 ingresaron")).toBeInTheDocument();
  });

  it("desde 15 minutos antes del inicio ofrece la franja próxima", async () => {
    vi.setSystemTime(a("09:50"));
    vi.mocked(turnosApi.cupoGym).mockResolvedValue([unaFranjaGym(DIA, 10)]);
    renderWithRouter(<IngresoPage />);

    expect(await screen.findByText("Próxima franja")).toBeInTheDocument();
  });

  it("sin franja en curso (domingo, feriado o fuera de horario) muestra un estado vacío", async () => {
    vi.mocked(turnosApi.cupoGym).mockResolvedValue([]);
    renderWithRouter(<IngresoPage />);

    expect(await screen.findByText(/No hay una franja de gimnasio en curso/)).toBeInTheDocument();
    expect(screen.queryByLabelText("Buscar por nombre o DNI")).not.toBeInTheDocument();
  });

  it("una franja sin reservas lo dice", async () => {
    vi.mocked(turnosApi.listarTurnos).mockResolvedValue([]);
    renderWithRouter(<IngresoPage />);

    expect(await screen.findByText("Nadie reservó esta franja.")).toBeInTheDocument();
    expect(screen.getByText("0 de 0 ingresaron")).toBeInTheDocument();
  });

  it("si falla la carga muestra el error", async () => {
    vi.mocked(turnosApi.listarTurnos).mockRejectedValue(new Error("boom"));
    renderWithRouter(<IngresoPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo completar la operación");
  });
});
