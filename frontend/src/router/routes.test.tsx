import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../context/AuthContext";
import { AppRoutes } from "./routes";

function renderAt(path: string) {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>
    </AuthProvider>,
  );
}

describe("AppRoutes", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it('"/" redirige a /login', async () => {
    renderAt("/");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Ingresar" })).toBeInTheDocument(),
    );
  });

  it("una ruta desconocida (catch-all) redirige a /login", async () => {
    renderAt("/esto-no-existe");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Ingresar" })).toBeInTheDocument(),
    );
  });

  it("/recuperar-contrasena renderiza la pantalla informativa", async () => {
    renderAt("/recuperar-contrasena");
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Recuperar contraseña" })).toBeInTheDocument(),
    );
  });

  it("/registro renderiza W-06 sin selector de rol", async () => {
    renderAt("/registro");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Crear cuenta" })).toBeInTheDocument(),
    );
    expect(screen.queryByLabelText(/rol/i)).not.toBeInTheDocument();
  });

  it.each(["/admin/dashboard", "/profesional/agenda", "/socio/turnos"])(
    "%s sin sesión redirige a /login (RoleGuard)",
    async (path) => {
      renderAt(path);
      await waitFor(() =>
        expect(screen.getByRole("button", { name: "Ingresar" })).toBeInTheDocument(),
      );
    },
  );
});
