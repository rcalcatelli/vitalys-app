import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../api/http";
import * as turnosApi from "../api/turnosApi";
import { ToastProvider } from "../context/ToastContext";
import { unEstadoGym, unTurno } from "../test/turnoFixture";
import type { ProximaAgenda } from "../types/turno";
import { ReservarConsultorioPage } from "./ReservarConsultorioPage";

vi.mock("../api/turnosApi", () => ({
  proximaAgenda: vi.fn(),
  estadoGym: vi.fn(),
  slotsDisponibles: vi.fn(),
  reservarConsultorio: vi.fn(),
}));

// Lunes 26/10/2026, 10:00 en Buenos Aires.
const AHORA = new Date("2026-10-26T13:00:00Z");

function agenda(o: Partial<ProximaAgenda> = {}): ProximaAgenda {
  return {
    profesionalId: 1,
    nombre: "Valentina",
    apellido: "Méndez",
    especialidad: "NUTRICION",
    duracionTurnoMinutos: 30,
    fecha: "2026-10-26",
    libres: 2,
    ...o,
  };
}
const AGENDAS = [
  agenda(),
  agenda({
    profesionalId: 2,
    nombre: "Pablo",
    apellido: "Ruiz",
    especialidad: "PSICOLOGIA",
    duracionTurnoMinutos: 50,
    fecha: "2026-10-28",
    libres: 5,
  }),
  agenda({ profesionalId: 3, nombre: "Carla", apellido: "Gómez", fecha: null, libres: 0 }),
];

const SLOTS = [
  { inicio: "2026-10-26T09:30:00-03:00", fin: "2026-10-26T10:00:00-03:00", libre: false },
  { inicio: "2026-10-26T11:00:00-03:00", fin: "2026-10-26T11:30:00-03:00", libre: true },
  { inicio: "2026-10-26T11:30:00-03:00", fin: "2026-10-26T12:00:00-03:00", libre: false },
];

function montar() {
  return render(
    <ToastProvider>
      <MemoryRouter>
        <ReservarConsultorioPage />
      </MemoryRouter>
    </ToastProvider>,
  );
}

async function hastaLaBarra() {
  montar();
  await userEvent.click(await screen.findByRole("button", { name: /Lic. Valentina Méndez/ }));
  await userEvent.click(await screen.findByRole("button", { name: /11:00/ }));
}

describe("ReservarConsultorioPage", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(AHORA);
    vi.mocked(turnosApi.proximaAgenda).mockResolvedValue(AGENDAS);
    vi.mocked(turnosApi.estadoGym).mockResolvedValue(unEstadoGym());
    vi.mocked(turnosApi.slotsDisponibles).mockResolvedValue(SLOTS);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("lista una tarjeta por profesional con su próxima agenda", async () => {
    montar();
    expect(
      await screen.findByText("Próxima agenda: hoy, lun 26 oct · 2 libres"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Próxima agenda: en 2 días, mié 28 oct · 5 libres"),
    ).toBeInTheDocument();
    expect(screen.getByText("Sin agenda próxima")).toBeInTheDocument();
    expect(screen.getByText("50 min")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Lic. Carla Gómez/ })).toBeDisabled();
  });

  it("al elegir profesional muestra el día de su próxima agenda y los horarios", async () => {
    montar();
    await userEvent.click(await screen.findByRole("button", { name: /Lic. Valentina Méndez/ }));
    await waitFor(() => expect(turnosApi.slotsDisponibles).toHaveBeenCalledWith(1, "2026-10-26"));
    expect(await screen.findByText("Próximo día con agenda")).toBeInTheDocument();
    expect(screen.getByText("Lunes 26 de octubre · hoy")).toBeInTheDocument();
    expect(screen.getByText("Lic. Valentina Méndez · Nutrición · 30 min")).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /11:00/ })).toBeEnabled();
    expect(screen.getByRole("button", { name: /11:30/ })).toBeDisabled();
    expect(screen.getByText("Ya pasó")).toBeInTheDocument();
    expect(screen.getByText(/Cancelación en término hasta 24 h antes/)).toBeInTheDocument();
  });

  it("el segundo paso del stepper se activa al elegir", async () => {
    montar();
    await screen.findByText("Próxima agenda: hoy, lun 26 oct · 2 libres");
    expect(screen.getByText("2")).toHaveClass("bg-surface-2");
    await userEvent.click(screen.getByRole("button", { name: /Lic. Valentina Méndez/ }));
    expect(screen.getByText("2")).toHaveClass("bg-clin");
  });

  it("elegir un horario muestra la barra y Confirmar turno reserva, avisa con un toast y vuelve al paso 1", async () => {
    vi.mocked(turnosApi.reservarConsultorio).mockResolvedValue(unTurno());
    await hastaLaBarra();
    expect(screen.getByText("Lunes 26 de octubre · 11:00 – 11:30")).toBeInTheDocument();
    expect(screen.getByText("Lic. Valentina Méndez · 30 min")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Confirmar turno" }));
    expect(turnosApi.reservarConsultorio).toHaveBeenCalledWith(1, "2026-10-26T11:00:00-03:00");
    expect(
      await screen.findByText("Turno confirmado: Nutrición, Lun 26 oct 11:00"),
    ).toBeInTheDocument();
    await waitFor(() => expect(turnosApi.proximaAgenda).toHaveBeenCalledTimes(2));
    expect(screen.queryByText("Próximo día con agenda")).not.toBeInTheDocument();
  });

  it("un 409 (carrera) avisa que ya fue tomado y recarga los horarios", async () => {
    vi.mocked(turnosApi.reservarConsultorio).mockRejectedValue(new ApiError(409, "Conflicto"));
    await hastaLaBarra();
    await userEvent.click(screen.getByRole("button", { name: "Confirmar turno" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Ese horario ya fue tomado por otra persona. Elegí otro.",
    );
    await waitFor(() => expect(turnosApi.slotsDisponibles).toHaveBeenCalledTimes(2));
  });

  it("un 422 muestra el mensaje del servidor", async () => {
    vi.mocked(turnosApi.reservarConsultorio).mockRejectedValue(
      new ApiError(422, "No se puede reservar un horario que ya pasó"),
    );
    await hastaLaBarra();
    await userEvent.click(screen.getByRole("button", { name: "Confirmar turno" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("que ya pasó");
  });

  it("Cambiar descarta el horario elegido sin reservar", async () => {
    await hastaLaBarra();
    await userEvent.click(screen.getByRole("button", { name: "Cambiar" }));
    expect(screen.queryByRole("button", { name: "Confirmar turno" })).not.toBeInTheDocument();
    expect(turnosApi.reservarConsultorio).not.toHaveBeenCalled();
  });

  it("sin horarios en el día lo informa y si fallan muestra el error", async () => {
    vi.mocked(turnosApi.slotsDisponibles).mockResolvedValueOnce([]);
    montar();
    await userEvent.click(await screen.findByRole("button", { name: /Lic. Valentina Méndez/ }));
    expect(
      await screen.findByText("Este profesional no tiene horarios para este día."),
    ).toBeInTheDocument();
    vi.mocked(turnosApi.slotsDisponibles).mockRejectedValue(new Error("boom"));
    await userEvent.click(screen.getByRole("button", { name: /Lic. Pablo Ruiz/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo completar");
  });

  it("con períodos impagos avisa que las consultas siguen habilitadas", async () => {
    vi.mocked(turnosApi.estadoGym).mockResolvedValue(unEstadoGym({ periodosImpagos: 4 }));
    montar();
    expect(
      await screen.findByText(
        "Tenés períodos impagos de gimnasio, pero las consultas siguen habilitadas.",
      ),
    ).toBeInTheDocument();
  });

  it("sin deuda no muestra el aviso de mora", async () => {
    montar();
    await screen.findByRole("button", { name: /Lic. Valentina Méndez/ });
    expect(screen.queryByText(/períodos impagos de gimnasio/)).not.toBeInTheDocument();
  });

  it("sin profesionales activos lo informa", async () => {
    vi.mocked(turnosApi.proximaAgenda).mockResolvedValue([]);
    montar();
    expect(
      await screen.findByText("Por ahora no hay profesionales con agenda disponible."),
    ).toBeInTheDocument();
  });

  it("si no se pueden cargar los profesionales muestra el error y permite reintentar", async () => {
    vi.mocked(turnosApi.proximaAgenda).mockRejectedValueOnce(new Error("boom"));
    montar();
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo completar");
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(
      await screen.findByRole("button", { name: /Lic. Valentina Méndez/ }),
    ).toBeInTheDocument();
  });
});
