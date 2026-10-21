import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as notificacionesApi from "../api/notificacionesApi";
import { unaNotificacion } from "../test/notificacionFixture";
import { renderWithRouter } from "../test/renderWithRouter";
import { HoyPage } from "./HoyPage";

vi.mock("../api/notificacionesApi", () => ({ listarFallidas: vi.fn() }));

describe("HoyPage", () => {
  beforeEach(() => {
    vi.mocked(notificacionesApi.listarFallidas).mockReset();
  });

  it("muestra 'Hoy en el centro' con las notificaciones fallidas y el badge del menú", async () => {
    vi.mocked(notificacionesApi.listarFallidas).mockResolvedValue([
      unaNotificacion(),
      unaNotificacion({ id: 2, tipo: "HUERFANA", pacienteNombre: "Ana Paz" }),
    ]);
    renderWithRouter(<HoyPage />);

    expect(screen.getByRole("heading", { name: "Hoy en el centro" })).toBeInTheDocument();
    expect(await screen.findByText("Juan García")).toBeInTheDocument();
    expect(screen.getByText("Ana Paz")).toBeInTheDocument();
    expect(screen.getByText("Falló dos veces")).toBeInTheDocument();
    expect(screen.getByText("Sin confirmar")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Hoy2" })).toBeInTheDocument();
    expect(notificacionesApi.listarFallidas).toHaveBeenCalledTimes(1);
  });

  it("sin fallidas muestra el estado vacío y no hay badge", async () => {
    vi.mocked(notificacionesApi.listarFallidas).mockResolvedValue([]);
    renderWithRouter(<HoyPage />);

    expect(await screen.findByText("No hay notificaciones fallidas.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Hoy" })).toBeInTheDocument();
  });

  it("si la consulta falla muestra el error", async () => {
    vi.mocked(notificacionesApi.listarFallidas).mockRejectedValue(new Error("boom"));
    renderWithRouter(<HoyPage />);

    expect(await screen.findByText(/No se pudieron cargar las notificaciones/)).toBeInTheDocument();
    expect(screen.queryByText("Cargando…")).not.toBeInTheDocument();
  });
});
