import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../api/http";
import * as turnosApi from "../api/turnosApi";
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
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("pide hoy a +7 días y muestra paciente y DNI con el título de la agenda", async () => {
    montar();
    expect(await screen.findByText("Juan García")).toBeInTheDocument();
    expect(turnosApi.miAgenda).toHaveBeenCalledWith("2026-10-26", "2026-11-02");
    expect(screen.getByText("DNI 30111222")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Agenda de hoy" })).toBeInTheDocument();
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

  it("sin turnos muestra el estado vacío", async () => {
    vi.mocked(turnosApi.miAgenda).mockResolvedValue([]);
    montar();
    expect(await screen.findByText("No tenés turnos en los próximos 7 días.")).toBeInTheDocument();
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
