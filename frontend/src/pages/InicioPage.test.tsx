import { screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { setToken } from "../api/http";
import { renderWithRouter } from "../test/renderWithRouter";
import { InicioPage } from "./InicioPage";

function sesion(usuario: Record<string, unknown>) {
  setToken("jwt");
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve(usuario) }),
  );
}

describe("InicioPage", () => {
  beforeEach(() => vi.unstubAllGlobals());

  it("saluda por el primer nombre", async () => {
    sesion({
      id: 1,
      email: "m@mail.com",
      rol: "SOCIO_PACIENTE",
      nombre: "María José",
      apellido: "Pérez",
    });
    renderWithRouter(<InicioPage />);
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Hola, María" })).toBeInTheDocument(),
    );
  });

  it("sin nombre muestra 'Inicio'", () => {
    renderWithRouter(<InicioPage />);
    expect(screen.getByRole("heading", { name: "Inicio" })).toBeInTheDocument();
  });
});
