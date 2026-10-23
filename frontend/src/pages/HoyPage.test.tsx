import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as notificacionesApi from "../api/notificacionesApi";
import * as resumenApi from "../api/resumenApi";
import { ShellContext } from "../components/templates/AppShell/ShellContext";
import { unResumen } from "../test/resumenFixture";
import { unaNotificacion } from "../test/notificacionFixture";
import { renderWithRouter } from "../test/renderWithRouter";
import { HoyPage } from "./HoyPage";

vi.mock("../api/notificacionesApi", () => ({ listarFallidas: vi.fn() }));
vi.mock("../api/resumenApi", () => ({ obtenerResumenHoy: vi.fn() }));

describe("HoyPage", () => {
  beforeEach(() => {
    vi.mocked(notificacionesApi.listarFallidas).mockReset();
    vi.mocked(resumenApi.obtenerResumenHoy).mockReset();
    vi.mocked(resumenApi.obtenerResumenHoy).mockResolvedValue(unResumen());
  });

  it("es el panel de inicio: muestra los indicadores y quién requiere atención", async () => {
    vi.mocked(notificacionesApi.listarFallidas).mockResolvedValue([]);
    renderWithRouter(<HoyPage />);

    expect(await screen.findByText("Turnos de gym hoy")).toBeInTheDocument();
    expect(screen.getByText("Juan García")).toBeInTheDocument();
  });

  it("si el resumen falla, igual muestra las notificaciones", async () => {
    vi.mocked(resumenApi.obtenerResumenHoy).mockRejectedValue(new Error("boom"));
    vi.mocked(notificacionesApi.listarFallidas).mockResolvedValue([]);
    renderWithRouter(<HoyPage />);

    expect(await screen.findByText(/No se pudo cargar el resumen del día/)).toBeInTheDocument();
    expect(await screen.findByText("No hay notificaciones fallidas.")).toBeInTheDocument();
  });

  it("muestra 'Hoy en el centro' con las notificaciones fallidas", async () => {
    vi.mocked(notificacionesApi.listarFallidas).mockResolvedValue([
      unaNotificacion(),
      unaNotificacion({ id: 2, tipo: "HUERFANA", pacienteNombre: "Ana Paz" }),
    ]);
    renderWithRouter(<HoyPage />);

    expect(screen.getByRole("heading", { name: "Hoy en el centro" })).toBeInTheDocument();
    expect(await screen.findByText("Ana Paz")).toBeInTheDocument();
    expect(screen.getByText("Falló dos veces")).toBeInTheDocument();
    expect(screen.getByText("Sin confirmar")).toBeInTheDocument();
    expect(notificacionesApi.listarFallidas).toHaveBeenCalledTimes(1);
  });

  it("sin fallidas muestra el estado vacío", async () => {
    vi.mocked(notificacionesApi.listarFallidas).mockResolvedValue([]);
    renderWithRouter(<HoyPage />);

    expect(await screen.findByText("No hay notificaciones fallidas.")).toBeInTheDocument();
  });

  it("si la consulta falla muestra el error", async () => {
    vi.mocked(notificacionesApi.listarFallidas).mockRejectedValue(new Error("boom"));
    renderWithRouter(<HoyPage />);

    expect(await screen.findByText(/No se pudieron cargar las notificaciones/)).toBeInTheDocument();
    expect(screen.queryByText("Cargando…")).not.toBeInTheDocument();
  });

  it("dentro del shell usa las fallidas que ya pidió el menú y no las consulta de nuevo", async () => {
    renderWithRouter(
      <ShellContext.Provider
        value={{
          chipAhora: null,
          fallidas: { lista: [unaNotificacion({ pacienteNombre: "Ana Paz" })], error: false },
        }}
      >
        <HoyPage />
      </ShellContext.Provider>,
    );

    expect(await screen.findByText("Ana Paz")).toBeInTheDocument();
    expect(notificacionesApi.listarFallidas).not.toHaveBeenCalled();
  });

  it("dentro del shell, si el menú no pudo cargarlas, lo informa", async () => {
    renderWithRouter(
      <ShellContext.Provider value={{ chipAhora: null, fallidas: { lista: null, error: true } }}>
        <HoyPage />
      </ShellContext.Provider>,
    );

    expect(await screen.findByText(/No se pudieron cargar las notificaciones/)).toBeInTheDocument();
    expect(notificacionesApi.listarFallidas).not.toHaveBeenCalled();
  });

  it("'Ir a Pagos' abre /admin/pagos", async () => {
    const user = userEvent.setup();
    vi.mocked(notificacionesApi.listarFallidas).mockResolvedValue([]);
    renderWithRouter(<HoyPage />, {
      extraRoutes: <Route path="/admin/pagos" element={<p>Pantalla de pagos</p>} />,
    });

    await user.click(await screen.findByRole("button", { name: "Ir a Pagos" }));

    expect(screen.getByText("Pantalla de pagos")).toBeInTheDocument();
  });
});
