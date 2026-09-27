import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithRouter } from "../test/renderWithRouter";
import { LoginPage } from "./LoginPage";

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response;
}

async function completarFormulario(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("DNI o email"), "38100001");
  await user.type(screen.getByLabelText("Contraseña"), "contrasena123");
  await user.click(screen.getByRole("button", { name: "Ingresar" }));
}

describe("LoginPage", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    document.documentElement.removeAttribute("data-theme");
  });

  it("envía identificador (DNI o email) y contraseña al backend", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse(200, { token: "jwt-abc" }))
      .mockResolvedValueOnce(
        jsonResponse(200, { id: 1, email: "socio@vitalys.test", rol: "SOCIO_PACIENTE" }),
      );

    renderWithRouter(<LoginPage />, { path: "/login" });
    await completarFormulario(user);

    await waitFor(() => expect(vi.mocked(fetch)).toHaveBeenCalled());
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe("/api/auth/login");
    expect(JSON.parse(init?.body as string)).toEqual({
      identificador: "38100001",
      contrasena: "contrasena123",
    });
  });

  it("ante 401 muestra un único mensaje genérico (no revela si el identificador existe)", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse(401, { message: "Credenciales inválidas" }),
    );

    renderWithRouter(<LoginPage />, { path: "/login" });
    await completarFormulario(user);

    const alerta = await screen.findByRole("alert");
    expect(alerta).toHaveTextContent("DNI/email o contraseña incorrectos");
    // El mensaje no debe filtrar el detalle real que devolvió el backend.
    expect(alerta).not.toHaveTextContent("Credenciales inválidas");
  });

  it("en éxito redirige según el rol devuelto por /me", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse(200, { token: "jwt-abc" }))
      .mockResolvedValueOnce(
        jsonResponse(200, { id: 1, email: "admin@vitalys.test", rol: "ADMIN" }),
      );

    renderWithRouter(<LoginPage />, {
      path: "/login",
      extraRoutes: <Route path="/admin/dashboard" element={<div>Panel ADMIN</div>} />,
    });
    await completarFormulario(user);

    await waitFor(() => expect(screen.getByText("Panel ADMIN")).toBeInTheDocument());
  });

  it("una cuenta de demostración autocompleta el formulario y no lo envía sola", async () => {
    const user = userEvent.setup();
    renderWithRouter(<LoginPage />, { path: "/login" });

    await user.click(screen.getByRole("button", { name: /María Pérez/ }));

    expect(screen.getByLabelText("DNI o email")).toHaveValue("38100001");
    expect(screen.getByLabelText("Contraseña")).toHaveValue("Admin1234!");
    expect(fetch).not.toHaveBeenCalled();
  });

  it('"¿Olvidaste tu contraseña?" navega a la pantalla informativa de recuperación', async () => {
    const user = userEvent.setup();
    renderWithRouter(<LoginPage />, {
      path: "/login",
      extraRoutes: (
        <Route path="/recuperar-contrasena" element={<div>Pantalla de recuperación</div>} />
      ),
    });

    await user.click(screen.getByRole("button", { name: "¿Olvidaste tu contraseña?" }));

    await waitFor(() => expect(screen.getByText("Pantalla de recuperación")).toBeInTheDocument());
  });

  it('"Registrate" navega a /registro', async () => {
    const user = userEvent.setup();
    renderWithRouter(<LoginPage />, {
      path: "/login",
      extraRoutes: <Route path="/registro" element={<div>Pantalla de registro</div>} />,
    });

    await user.click(screen.getByRole("button", { name: "Registrate" }));

    await waitFor(() => expect(screen.getByText("Pantalla de registro")).toBeInTheDocument());
  });

  it("el toggle de tema cambia data-theme en <html> y lo persiste en localStorage", async () => {
    const user = userEvent.setup();
    renderWithRouter(<LoginPage />, { path: "/login" });

    expect(document.documentElement.getAttribute("data-theme")).toBe("light");

    await user.click(screen.getByRole("button", { name: "Modo oscuro" }));

    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(localStorage.getItem("vitalys_theme")).toBe("dark");
    expect(screen.getByRole("button", { name: "Modo claro" })).toBeInTheDocument();
  });
});
