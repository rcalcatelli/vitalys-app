import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../api/http";
import * as profesionalesApi from "../api/profesionalesApi";
import * as turnosApi from "../api/turnosApi";
import { unProfesional } from "../test/profesionalFixture";
import { unTurno, unTurnoGym } from "../test/turnoFixture";
import { MisTurnosPage } from "./MisTurnosPage";

vi.mock("../context/AuthContext", async (importOriginal) => {
  const real = await importOriginal<typeof import("../context/AuthContext")>();
  return {
    ...real,
    useAuth: () => ({
      rol: "SOCIO_PACIENTE",
      usuario: { id: 1, email: "socio@vitalys.com", rol: "SOCIO_PACIENTE" },
      logout: vi.fn(),
    }),
  };
});

vi.mock("../api/profesionalesApi", () => ({ listarProfesionales: vi.fn() }));
vi.mock("../api/turnosApi", () => ({ misTurnos: vi.fn(), cancelarTurno: vi.fn() }));

// Lunes 26/10/2026, 10:00 en Buenos Aires.
const AHORA = new Date("2026-10-26T13:00:00Z");

const consulta = unTurno({
  id: 1,
  inicio: "2026-10-30T10:00:00-03:00",
  fin: "2026-10-30T10:30:00-03:00",
});
const gym = unTurnoGym({
  id: 2,
  inicio: "2026-10-26T11:00:00-03:00",
  fin: "2026-10-26T12:00:00-03:00",
});
const pasado = unTurno({
  id: 3,
  inicio: "2026-10-20T10:00:00-03:00",
  fin: "2026-10-20T10:30:00-03:00",
  estado: "COMPLETADO",
});

function montar() {
  return render(
    <MemoryRouter>
      <MisTurnosPage />
    </MemoryRouter>,
  );
}

describe("MisTurnosPage", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(AHORA);
    vi.mocked(profesionalesApi.listarProfesionales).mockResolvedValue([unProfesional()]);
    vi.mocked(turnosApi.misTurnos).mockResolvedValue([consulta, gym, pasado]);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("lista próximos e historial con el nombre del profesional", async () => {
    montar();
    expect(await screen.findAllByText("Lic. Valentina Méndez")).toHaveLength(2);
    expect(screen.getByRole("heading", { name: "Próximos" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Historial" })).toBeInTheDocument();
    expect(screen.getByText("Completado")).toBeInTheDocument();
  });

  it("si no se pueden leer los profesionales usa la etiqueta de respaldo", async () => {
    vi.mocked(profesionalesApi.listarProfesionales).mockRejectedValue(new Error("boom"));
    montar();
    expect(await screen.findAllByText("Profesional no disponible")).toHaveLength(2);
  });

  it("si falla la carga de turnos muestra el error", async () => {
    vi.mocked(turnosApi.misTurnos).mockRejectedValue(new Error("boom"));
    montar();
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo completar");
  });

  it("cancela con motivo: informa el plazo, llama a la API, avisa y recarga", async () => {
    vi.mocked(turnosApi.cancelarTurno).mockResolvedValue({
      ...consulta,
      estado: "CANCELADO_EN_TIEMPO",
    });
    montar();
    await userEvent.click(await screen.findByRole("button", { name: /Cancelar turno Consulta/ }));
    const dialogo = screen.getByRole("dialog", { name: "Cancelar turno" });
    expect(within(dialogo).getByText("Cancelación en término")).toBeInTheDocument();
    await userEvent.type(within(dialogo).getByLabelText("Motivo"), "No llego");
    await userEvent.click(within(dialogo).getByRole("button", { name: "Confirmar cancelación" }));
    expect(turnosApi.cancelarTurno).toHaveBeenCalledWith(1, "No llego");
    expect(await screen.findByText("Turno cancelado.")).toBeInTheDocument();
    await waitFor(() => expect(turnosApi.misTurnos).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("un turno de gimnasio a menos de 2 h se cancela fuera de término", async () => {
    montar();
    await userEvent.click(await screen.findByRole("button", { name: /Cancelar turno Gimnasio/ }));
    expect(screen.getByText("Cancelación fuera de término")).toBeInTheDocument();
  });

  it("sin motivo no se envía", async () => {
    montar();
    await userEvent.click(await screen.findByRole("button", { name: /Cancelar turno Consulta/ }));
    await userEvent.click(screen.getByRole("button", { name: "Confirmar cancelación" }));
    expect(turnosApi.cancelarTurno).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("Escribí el motivo");
  });

  it("si el servidor rechaza la cancelación muestra su mensaje y recarga", async () => {
    vi.mocked(turnosApi.cancelarTurno).mockRejectedValue(
      new ApiError(422, "El turno ya no está reservado"),
    );
    montar();
    await userEvent.click(await screen.findByRole("button", { name: /Cancelar turno Consulta/ }));
    await userEvent.type(screen.getByLabelText("Motivo"), "x");
    await userEvent.click(screen.getByRole("button", { name: "Confirmar cancelación" }));
    expect(await screen.findByText("El turno ya no está reservado")).toBeInTheDocument();
    await waitFor(() => expect(turnosApi.misTurnos).toHaveBeenCalledTimes(2));
  });

  it("Volver cierra el diálogo sin cancelar", async () => {
    montar();
    await userEvent.click(await screen.findByRole("button", { name: /Cancelar turno Consulta/ }));
    await userEvent.click(screen.getByRole("button", { name: "Volver" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(turnosApi.cancelarTurno).not.toHaveBeenCalled();
  });
});
