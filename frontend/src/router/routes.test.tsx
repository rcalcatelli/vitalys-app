import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { setToken } from "../api/http";
import { AuthProvider } from "../context/AuthContext";
import { unEstadoCuenta } from "../test/pagoFixture";
import { unEstadoGym } from "../test/turnoFixture";
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

  it.each([
    "/admin/dashboard",
    "/admin/hoy",
    "/admin/personas",
    "/admin/profesionales",
    "/admin/pagos",
    "/profesional/agenda",
    "/socio/turnos",
    "/socio/estado-cuenta",
    "/socio/reservar-gimnasio",
    "/socio/reservar-consultorio",
    "/profesional/disponibilidad",
  ])("%s sin sesión redirige a /login (RoleGuard)", async (path) => {
    renderAt(path);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Ingresar" })).toBeInTheDocument(),
    );
  });

  function sesionComo(rol: string) {
    setToken(`jwt-${rol}`);
    vi.mocked(fetch).mockImplementation((entrada) => {
      const url = String(entrada);
      let cuerpo: unknown = [];
      if (url.includes("/api/auth/me")) cuerpo = { id: 1, email: "u@vitalys.test", rol };
      else if (url.includes("/gym/estado")) cuerpo = unEstadoGym();
      else if (url.includes("/api/pagos/mi-estado-cuenta")) cuerpo = unEstadoCuenta();
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(cuerpo),
      } as Response);
    });
  }

  it.each([
    ["/socio/reservar-gimnasio", "Reservar gimnasio"],
    ["/socio/reservar-consultorio", "Turno de consultorio"],
    ["/socio/turnos", "Mis turnos"],
    ["/socio/estado-cuenta", "Estado de cuenta"],
  ])("%s muestra su pantalla al socio", async (path, titulo) => {
    sesionComo("SOCIO_PACIENTE");
    renderAt(path);
    expect(await screen.findByRole("heading", { name: titulo })).toBeInTheDocument();
  });

  it.each(["/socio/reservar-gimnasio", "/socio/reservar-consultorio"])(
    "%s rechaza al profesional y lo manda a su agenda",
    async (path) => {
      sesionComo("PROFESIONAL");
      renderAt(path);
      expect(await screen.findByRole("heading", { name: "Agenda" })).toBeInTheDocument();
    },
  );

  it("/profesional/agenda muestra la agenda al profesional", async () => {
    sesionComo("PROFESIONAL");
    renderAt("/profesional/agenda");
    expect(await screen.findByRole("heading", { name: "Agenda" })).toBeInTheDocument();
  });

  it("/profesional/agenda rechaza al socio y lo manda a sus turnos", async () => {
    sesionComo("SOCIO_PACIENTE");
    renderAt("/profesional/agenda");
    expect(await screen.findByRole("heading", { name: "Mis turnos" })).toBeInTheDocument();
  });
});
