import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, setToken } from "../api/http";
import * as pagosApi from "../api/pagosApi";
import * as profesionalesApi from "../api/profesionalesApi";
import * as turnosApi from "../api/turnosApi";
import { unEstadoCuenta } from "../test/pagoFixture";
import { unProfesional } from "../test/profesionalFixture";
import { renderWithRouter } from "../test/renderWithRouter";
import { unEstadoGym, unTurno, unTurnoGym } from "../test/turnoFixture";
import { InicioPage } from "./InicioPage";

vi.mock("../api/pagosApi", () => ({ miEstadoCuenta: vi.fn() }));
vi.mock("../api/profesionalesApi", () => ({ listarProfesionales: vi.fn() }));
vi.mock("../api/turnosApi", () => ({
  misTurnos: vi.fn(),
  estadoGym: vi.fn(),
  cancelarTurno: vi.fn(),
}));

// Martes 29/09/2026, 10:40 en Buenos Aires.
const AHORA = new Date("2026-09-29T13:40:00Z");

const gymManana = unTurnoGym({
  id: 1,
  inicio: "2026-09-30T08:00:00-03:00",
  fin: "2026-09-30T09:00:00-03:00",
});
const consulta = unTurno({
  id: 2,
  inicio: "2026-10-01T16:00:00-03:00",
  fin: "2026-10-01T16:30:00-03:00",
});

function sesion(nombre: string | null = "María José") {
  setToken("jwt");
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          id: 1,
          email: "m@mail.com",
          rol: "SOCIO_PACIENTE",
          nombre,
          apellido: "Pérez",
        }),
    }),
  );
}

function montar() {
  return renderWithRouter(<InicioPage />, {
    extraRoutes: [
      <Route key="t" path="/socio/turnos" element={<div>pantalla turnos</div>} />,
      <Route key="c" path="/socio/estado-cuenta" element={<div>pantalla cuenta</div>} />,
      <Route key="g" path="/socio/reservar-gimnasio" element={<div>pantalla gimnasio</div>} />,
      <Route
        key="o"
        path="/socio/reservar-consultorio"
        element={<div>pantalla consultorio</div>}
      />,
    ],
  });
}

describe("InicioPage", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(AHORA);
    sesion();
    vi.mocked(turnosApi.misTurnos).mockResolvedValue([consulta, gymManana]);
    vi.mocked(turnosApi.estadoGym).mockResolvedValue(unEstadoGym());
    vi.mocked(pagosApi.miEstadoCuenta).mockResolvedValue(unEstadoCuenta());
    vi.mocked(profesionalesApi.listarProfesionales).mockResolvedValue([unProfesional()]);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("saluda por el primer nombre y muestra la fecha de hoy", async () => {
    montar();
    expect(await screen.findByRole("heading", { name: "Hola, María" })).toBeInTheDocument();
    expect(screen.getByText("Martes 29 de septiembre")).toBeInTheDocument();
  });

  it("muestra el próximo turno con 'mañana', hora y acciones", async () => {
    montar();
    expect(await screen.findByText("Tu próximo turno · mañana")).toBeInTheDocument();
    expect(screen.getByText("Miércoles")).toBeInTheDocument();
    expect(screen.getByText("septiembre")).toBeInTheDocument();
    expect(screen.getByText("08:00 – 09:00")).toBeInTheDocument();
    expect(screen.getByText("Sala de entrenamiento · 60 min")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Ver mis turnos" }));
    expect(await screen.findByText("pantalla turnos")).toBeInTheDocument();
  });

  it("un turno de consultorio dice 'Consulta de Nutrición' con el profesional", async () => {
    vi.mocked(turnosApi.misTurnos).mockResolvedValue([consulta]);
    montar();
    expect(await screen.findByText("Consulta de Nutrición")).toBeInTheDocument();
    expect(await screen.findByText("Lic. Valentina Méndez")).toBeInTheDocument();
    expect(screen.getByText("Tu próximo turno · en 2 días")).toBeInTheDocument();
  });

  it("sin turnos próximos muestra la tarjeta punteada", async () => {
    vi.mocked(turnosApi.misTurnos).mockResolvedValue([]);
    montar();
    expect(await screen.findByText("No tenés turnos próximos")).toBeInTheDocument();
  });

  it("la tarjeta de cuota lleva al estado de cuenta", async () => {
    montar();
    expect(await screen.findByText("Al día")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Ver estado de cuenta/ }));
    expect(await screen.findByText("pantalla cuenta")).toBeInTheDocument();
  });

  it("Reservar gimnasio lleva a la reserva de gimnasio", async () => {
    montar();
    await userEvent.click(await screen.findByRole("button", { name: /Reservar gimnasio/ }));
    expect(await screen.findByText("pantalla gimnasio")).toBeInTheDocument();
  });

  it("Pedir consulta lleva a la reserva de consultorio", async () => {
    montar();
    await userEvent.click(await screen.findByRole("button", { name: /Pedir consulta/ }));
    expect(await screen.findByText("pantalla consultorio")).toBeInTheDocument();
  });

  it("suspendido: el atajo de gimnasio queda deshabilitado con su texto y consultorio activo", async () => {
    vi.mocked(turnosApi.estadoGym).mockResolvedValue(unEstadoGym({ suspendido: true }));
    montar();
    expect(
      await screen.findByText("Reserva suspendida por períodos impagos: regularizá en recepción."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Reservar gimnasio/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Pedir consulta/ })).toBeEnabled();
  });

  it("sin gimnasio lo dice y deshabilita el atajo", async () => {
    vi.mocked(turnosApi.estadoGym).mockResolvedValue(unEstadoGym({ esSocioGym: false }));
    montar();
    expect(await screen.findByText("No tenés el servicio de gimnasio activo.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Reservar gimnasio/ })).toBeDisabled();
  });

  it("arma 'Tu semana' con el resumen de turnos por delante", async () => {
    montar();
    const semana = await screen.findByRole("region", { name: "Tu semana" });
    expect(within(semana).getByText("2 turnos por delante · 0 completados")).toBeInTheDocument();
    expect(within(semana).getByText("08:00")).toBeInTheDocument();
    expect(within(semana).getByText("16:00")).toBeInTheDocument();
  });

  it("si fallan los turnos muestra el error con Reintentar y el resto sigue funcionando", async () => {
    vi.mocked(turnosApi.misTurnos).mockRejectedValueOnce(new Error("boom"));
    montar();
    expect(await screen.findByText("No pudimos cargar tus turnos")).toBeInTheDocument();
    expect(await screen.findByText("Al día")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByText("Tu próximo turno · mañana")).toBeInTheDocument();
  });

  it("si falla la cuota solo esa tarjeta lo informa y se puede reintentar", async () => {
    vi.mocked(pagosApi.miEstadoCuenta).mockRejectedValueOnce(new ApiError(500, "x"));
    montar();
    expect(await screen.findByText("No pudimos cargar tu cuota.")).toBeInTheDocument();
    expect(await screen.findByText("Tu próximo turno · mañana")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByText("Al día")).toBeInTheDocument();
  });

  it("cancela el próximo turno desde Inicio y recarga", async () => {
    vi.mocked(turnosApi.cancelarTurno).mockResolvedValue({
      ...gymManana,
      estado: "CANCELADO_EN_TIEMPO",
    });
    montar();
    await userEvent.click(await screen.findByRole("button", { name: "Cancelar turno" }));
    const dialogo = screen.getByRole("dialog", { name: "Cancelar turno" });
    await userEvent.type(within(dialogo).getByLabelText("Motivo"), "No llego");
    await userEvent.click(within(dialogo).getByRole("button", { name: "Confirmar cancelación" }));
    expect(turnosApi.cancelarTurno).toHaveBeenCalledWith(1, "No llego");
    expect(await screen.findByText("Turno cancelado.")).toBeInTheDocument();
    await waitFor(() => expect(turnosApi.misTurnos).toHaveBeenCalledTimes(2));
  });

  it("si Recepción reservó el turno lo indica", async () => {
    vi.mocked(turnosApi.misTurnos).mockResolvedValue([
      { ...gymManana, reservadoPorRecepcion: true },
    ]);
    montar();
    expect(await screen.findByText("Reservado por Recepción")).toBeInTheDocument();
  });

  it("sin nombre muestra 'Inicio'", async () => {
    sesion(null);
    montar();
    expect(await screen.findByRole("heading", { name: "Inicio" })).toBeInTheDocument();
  });
});
