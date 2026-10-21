import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../api/http";
import * as profesionalesApi from "../api/profesionalesApi";
import * as turnosApi from "../api/turnosApi";
import { unProfesional } from "../test/profesionalFixture";
import { unTurno } from "../test/turnoFixture";
import { ReservarConsultorioPage } from "./ReservarConsultorioPage";

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
vi.mock("../api/turnosApi", () => ({ slotsDisponibles: vi.fn(), reservarConsultorio: vi.fn() }));

// Lunes 26/10/2026, 10:00 en Buenos Aires.
const AHORA = new Date("2026-10-26T13:00:00Z");

const nutri = unProfesional();
const psico = unProfesional({
  id: 2,
  nombre: "Pablo",
  apellido: "Ruiz",
  especialidad: "PSICOLOGIA",
  duracionTurnoMinutos: 50,
});
const baja = unProfesional({ id: 3, nombre: "Carla", apellido: "Gómez", activo: false });

const SLOTS = [
  { inicio: "2026-10-26T11:00:00-03:00", fin: "2026-10-26T11:30:00-03:00", libre: true },
  { inicio: "2026-10-26T11:30:00-03:00", fin: "2026-10-26T12:00:00-03:00", libre: false },
];

function montar() {
  return render(
    <MemoryRouter>
      <ReservarConsultorioPage />
    </MemoryRouter>,
  );
}

async function hastaElModal() {
  montar();
  await userEvent.selectOptions(await screen.findByLabelText("Especialidad"), "NUTRICION");
  await userEvent.click(screen.getByRole("button", { name: /Lic. Valentina Méndez/ }));
  await userEvent.click(await screen.findByRole("button", { name: /11:00/ }));
  return screen.getByRole("dialog", { name: "Confirmar turno" });
}

describe("ReservarConsultorioPage", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(AHORA);
    vi.mocked(profesionalesApi.listarProfesionales).mockResolvedValue([nutri, psico, baja]);
    vi.mocked(turnosApi.slotsDisponibles).mockResolvedValue(SLOTS);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("solo ofrece las especialidades con profesionales activos", async () => {
    montar();
    const select = await screen.findByLabelText("Especialidad");
    const opciones = within(select)
      .getAllByRole("option")
      .map((o) => o.textContent);
    expect(opciones).toEqual(["Elegí una especialidad", "Nutrición", "Psicología"]);
  });

  it("lista los profesionales activos de la especialidad elegida", async () => {
    montar();
    await userEvent.selectOptions(await screen.findByLabelText("Especialidad"), "PSICOLOGIA");
    const lista = screen.getByRole("list", { name: "Profesionales" });
    expect(within(lista).getByText("Lic. Pablo Ruiz")).toBeInTheDocument();
    expect(within(lista).getByText("50 min")).toBeInTheDocument();
    expect(screen.queryByText("Lic. Carla Gómez")).not.toBeInTheDocument();
  });

  it("al elegir profesional muestra los horarios; el ocupado no responde", async () => {
    montar();
    await userEvent.selectOptions(await screen.findByLabelText("Especialidad"), "NUTRICION");
    await userEvent.click(screen.getByRole("button", { name: /Lic. Valentina Méndez/ }));
    await waitFor(() => expect(turnosApi.slotsDisponibles).toHaveBeenCalledWith(1, "2026-10-26"));
    expect(await screen.findByRole("button", { name: /11:00/ })).toBeEnabled();
    expect(screen.getByRole("button", { name: /11:30/ })).toBeDisabled();
    expect(screen.getByText(/Cancelación en término hasta 24 h antes/)).toBeInTheDocument();
  });

  it("confirma el turno, avisa y recarga los horarios", async () => {
    vi.mocked(turnosApi.reservarConsultorio).mockResolvedValue(unTurno());
    const modal = await hastaElModal();
    expect(within(modal).getByText(/11:00 – 11:30/)).toBeInTheDocument();
    await userEvent.click(within(modal).getByRole("button", { name: "Confirmar turno" }));
    expect(turnosApi.reservarConsultorio).toHaveBeenCalledWith(1, "2026-10-26T11:00:00-03:00");
    expect(
      await screen.findByText("Turno confirmado: Nutrición, 26/10 11:00."),
    ).toBeInTheDocument();
    await waitFor(() => expect(turnosApi.slotsDisponibles).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("un 409 (carrera) avisa que ya fue tomado y recarga los horarios", async () => {
    vi.mocked(turnosApi.reservarConsultorio).mockRejectedValue(new ApiError(409, "Conflicto"));
    const modal = await hastaElModal();
    await userEvent.click(within(modal).getByRole("button", { name: "Confirmar turno" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Ese horario ya fue tomado por otra persona. Elegí otro.",
    );
    await waitFor(() => expect(turnosApi.slotsDisponibles).toHaveBeenCalledTimes(2));
  });

  it("un 422 muestra el mensaje del servidor", async () => {
    vi.mocked(turnosApi.reservarConsultorio).mockRejectedValue(
      new ApiError(422, "No se puede reservar un horario que ya pasó"),
    );
    const modal = await hastaElModal();
    await userEvent.click(within(modal).getByRole("button", { name: "Confirmar turno" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("que ya pasó");
  });

  it("Cancelar cierra el modal sin reservar", async () => {
    const modal = await hastaElModal();
    await userEvent.click(within(modal).getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(turnosApi.reservarConsultorio).not.toHaveBeenCalled();
  });

  it("cambiar de día o de especialidad pide otra vez y limpia la elección", async () => {
    montar();
    await userEvent.selectOptions(await screen.findByLabelText("Especialidad"), "NUTRICION");
    await userEvent.click(screen.getByRole("button", { name: /Lic. Valentina Méndez/ }));
    await userEvent.click(await screen.findByRole("button", { name: "Mar 27" }));
    await waitFor(() => expect(turnosApi.slotsDisponibles).toHaveBeenCalledWith(1, "2026-10-27"));
    await userEvent.selectOptions(screen.getByLabelText("Especialidad"), "");
    expect(screen.queryByRole("button", { name: "Mar 27" })).not.toBeInTheDocument();
  });

  it("sin horarios en el día lo informa y si fallan muestra el error", async () => {
    vi.mocked(turnosApi.slotsDisponibles).mockResolvedValueOnce([]);
    montar();
    await userEvent.selectOptions(await screen.findByLabelText("Especialidad"), "NUTRICION");
    await userEvent.click(screen.getByRole("button", { name: /Lic. Valentina Méndez/ }));
    expect(
      await screen.findByText("Este profesional no tiene horarios para este día."),
    ).toBeInTheDocument();
    vi.mocked(turnosApi.slotsDisponibles).mockRejectedValue(new Error("boom"));
    await userEvent.click(screen.getByRole("button", { name: "Mar 27" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo completar");
  });

  it("sin profesionales activos lo informa", async () => {
    vi.mocked(profesionalesApi.listarProfesionales).mockResolvedValue([baja]);
    montar();
    expect(
      await screen.findByText("Por ahora no hay profesionales con agenda disponible."),
    ).toBeInTheDocument();
  });

  it("si no se pueden cargar los profesionales muestra el error", async () => {
    vi.mocked(profesionalesApi.listarProfesionales).mockRejectedValue(new Error("boom"));
    montar();
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo completar");
  });
});
