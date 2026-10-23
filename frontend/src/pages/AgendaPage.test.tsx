import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../api/http";
import * as profesionalesApi from "../api/profesionalesApi";
import * as turnosApi from "../api/turnosApi";
import { unProfesional } from "../test/profesionalFixture";
import { unTurno, unTurnoAgenda } from "../test/turnoFixture";
import { AgendaPage } from "./AgendaPage";

vi.mock("../context/AuthContext", async (importOriginal) => {
  const real = await importOriginal<typeof import("../context/AuthContext")>();
  return {
    ...real,
    useAuth: () => ({
      rol: "PROFESIONAL",
      usuario: { id: 2, email: "pro@vitalys.com", rol: "PROFESIONAL" },
      logout: vi.fn(),
    }),
  };
});

vi.mock("../api/profesionalesApi", () => ({
  miPerfilProfesional: vi.fn(),
  listarFranjas: vi.fn(),
}));
vi.mock("../api/turnosApi", () => ({
  miAgenda: vi.fn(),
  marcarCompletado: vi.fn(),
  marcarAusente: vi.fn(),
}));

// Lunes 26/10/2026, 11:05 BA: el turno de las 11:00 ya empezó.
const AHORA = new Date("2026-10-26T14:05:00Z");

function montar() {
  return render(
    <MemoryRouter>
      <AgendaPage />
    </MemoryRouter>,
  );
}

describe("AgendaPage", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(AHORA);
    vi.mocked(turnosApi.miAgenda).mockResolvedValue([unTurnoAgenda()]);
    vi.mocked(profesionalesApi.miPerfilProfesional).mockResolvedValue(unProfesional());
    // Lunes de 10:00 a 12:00 en turnos de 30 min: 10:00, 10:30, 11:00 (reservado) y 11:30.
    vi.mocked(profesionalesApi.listarFranjas).mockResolvedValue([
      { id: 1, diaSemana: 1, horaInicio: "10:00:00", horaFin: "12:00:00" },
    ]);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("pide hoy a +7 días y muestra paciente y DNI con el título de la agenda", async () => {
    montar();
    expect(await screen.findByText("Juan García")).toBeInTheDocument();
    expect(turnosApi.miAgenda).toHaveBeenCalledWith("2026-10-26", "2026-11-02");
    expect(screen.getByText("30111222")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Agenda de hoy" })).toBeInTheDocument();
  });

  it("suma el resumen, los huecos libres y la especialidad en el encabezado", async () => {
    montar();
    expect(await screen.findByText("huecos libres")).toBeInTheDocument();
    expect(screen.getByText("huecos libres").previousSibling).toHaveTextContent("3");
    expect(screen.getByText("pacientes").previousSibling).toHaveTextContent("1");
    expect(screen.getByText("30 min")).toBeInTheDocument();
    expect(screen.getByText("Lunes 26 de octubre · Nutrición")).toBeInTheDocument();
    expect(screen.getByText("En curso")).toBeInTheDocument();
    expect(screen.getAllByText("Hueco libre (pasado)")).toHaveLength(2);
  });

  it("si no se puede leer la disponibilidad muestra la agenda sin huecos", async () => {
    vi.mocked(profesionalesApi.miPerfilProfesional).mockRejectedValue(new Error("boom"));
    montar();
    expect(await screen.findByText("Juan García")).toBeInTheDocument();
    expect(screen.queryByText("huecos libres")).not.toBeInTheDocument();
    expect(screen.getByText("Lunes 26 de octubre")).toBeInTheDocument();
  });

  it("Atendido marca el turno y recarga la agenda", async () => {
    vi.mocked(turnosApi.marcarCompletado).mockResolvedValue(unTurno());
    montar();
    await userEvent.click(await screen.findByRole("button", { name: "Atendido: Juan García" }));
    expect(turnosApi.marcarCompletado).toHaveBeenCalledWith(1);
    await waitFor(() => expect(turnosApi.miAgenda).toHaveBeenCalledTimes(2));
  });

  it("Ausente marca el turno", async () => {
    vi.mocked(turnosApi.marcarAusente).mockResolvedValue(unTurno());
    montar();
    await userEvent.click(await screen.findByRole("button", { name: "Ausente: Juan García" }));
    expect(turnosApi.marcarAusente).toHaveBeenCalledWith(1);
    await waitFor(() => expect(turnosApi.miAgenda).toHaveBeenCalledTimes(2));
  });

  it("un 422 muestra el mensaje del servidor y recarga la agenda", async () => {
    vi.mocked(turnosApi.marcarAusente).mockRejectedValue(
      new ApiError(422, "El turno todavía no comenzó"),
    );
    montar();
    await userEvent.click(await screen.findByRole("button", { name: "Ausente: Juan García" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("El turno todavía no comenzó");
    await waitFor(() => expect(turnosApi.miAgenda).toHaveBeenCalledTimes(2));
  });

  it("sin turnos y sin disponibilidad muestra el estado vacío", async () => {
    vi.mocked(turnosApi.miAgenda).mockResolvedValue([]);
    vi.mocked(profesionalesApi.listarFranjas).mockResolvedValue([]);
    montar();
    expect(await screen.findByText("No tenés turnos en los próximos 7 días.")).toBeInTheDocument();
  });

  it("sin turnos pero con disponibilidad lista los huecos libres de hoy", async () => {
    vi.mocked(turnosApi.miAgenda).mockResolvedValue([]);
    montar();
    expect(await screen.findByText("4")).toBeInTheDocument();
    expect(screen.getByText("huecos libres")).toBeInTheDocument();
  });

  it("si falla la carga muestra el error", async () => {
    vi.mocked(turnosApi.miAgenda).mockRejectedValue(new Error("boom"));
    montar();
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo completar");
  });

  it("el reloj de la pantalla habilita los botones cuando se acerca la hora", async () => {
    vi.useRealTimers();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date("2026-10-26T13:30:00Z")); // 10:30 BA, faltan 30 min
    montar();
    expect(await screen.findByRole("button", { name: "Atendido: Juan García" })).toBeDisabled();
    act(() => {
      vi.setSystemTime(new Date("2026-10-26T13:50:00Z")); // 10:50 BA, faltan 10 min
      vi.advanceTimersByTime(30_000);
    });
    expect(screen.getByRole("button", { name: "Atendido: Juan García" })).toBeEnabled();
  });
});
