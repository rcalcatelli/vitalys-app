import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithRouter } from "../test/renderWithRouter";
import { RegistroPage } from "./RegistroPage";

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response;
}

async function completarFormulario(
  user: ReturnType<typeof userEvent.setup>,
  options: { contrasena?: string; confirmar?: string } = {},
) {
  const { contrasena = "contrasena123", confirmar = contrasena } = options;
  await user.type(screen.getByLabelText("Email"), "nuevo@vitalys.test");
  await user.type(screen.getByLabelText("Contraseña"), contrasena);
  await user.type(screen.getByLabelText("Confirmar contraseña"), confirmar);
  await user.click(screen.getByRole("button", { name: "Crear cuenta" }));
}

describe("RegistroPage", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("no envía `rol` en el body — el rol siempre lo fuerza el backend (RF-01/CA-01-7)", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse(201, { token: "jwt-nuevo" }))
      .mockResolvedValueOnce(
        jsonResponse(200, { id: 10, email: "nuevo@vitalys.test", rol: "SOCIO_PACIENTE" }),
      );

    renderWithRouter(<RegistroPage />, { path: "/registro" });
    await completarFormulario(user);

    await waitFor(() => expect(vi.mocked(fetch)).toHaveBeenCalled());
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe("/api/auth/registro");

    const body = JSON.parse(init?.body as string);
    expect(body).toEqual({ email: "nuevo@vitalys.test", contrasena: "contrasena123" });
    expect(body).not.toHaveProperty("rol");
  });

  it("muestra el error de email duplicado ante 409", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse(409, { message: "El email ya está registrado" }),
    );

    renderWithRouter(<RegistroPage />, { path: "/registro" });
    await completarFormulario(user);

    const alerta = await screen.findByRole("alert");
    expect(alerta).toHaveTextContent("El email ya está registrado");
  });

  it("muestra el error de validación ante 400", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse(400, { message: "Datos de entrada inválidos" }),
    );

    renderWithRouter(<RegistroPage />, { path: "/registro" });
    await completarFormulario(user);

    const alerta = await screen.findByRole("alert");
    expect(alerta).toHaveTextContent(/email.*válido.*contraseña.*8 caracteres/i);
  });

  it("valida en el cliente que las contraseñas coincidan, sin llamar al backend", async () => {
    const user = userEvent.setup();

    renderWithRouter(<RegistroPage />, { path: "/registro" });
    await completarFormulario(user, { contrasena: "contrasena123", confirmar: "otra12345" });

    const alerta = await screen.findByRole("alert");
    expect(alerta).toHaveTextContent("Las contraseñas no coinciden");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("en éxito queda logueada y redirige a la home de SOCIO_PACIENTE", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse(201, { token: "jwt-nuevo" }))
      .mockResolvedValueOnce(
        jsonResponse(200, { id: 10, email: "nuevo@vitalys.test", rol: "SOCIO_PACIENTE" }),
      );

    renderWithRouter(<RegistroPage />, {
      path: "/registro",
      extraRoutes: <Route path="/socio/turnos" element={<div>Mis turnos</div>} />,
    });
    await completarFormulario(user);

    await waitFor(() => expect(screen.getByText("Mis turnos")).toBeInTheDocument());
  });

  it('"Ingresá" navega a /login', async () => {
    const user = userEvent.setup();
    renderWithRouter(<RegistroPage />, {
      path: "/registro",
      extraRoutes: <Route path="/login" element={<div>Pantalla de login</div>} />,
    });

    await user.click(screen.getByRole("button", { name: "Ingresá" }));

    await waitFor(() => expect(screen.getByText("Pantalla de login")).toBeInTheDocument());
  });
});
