import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setToken } from "../api/http";
import { PageHeader } from "../components/molecules/PageHeader";
import { AuthProvider } from "../context/AuthContext";
import { ThemeProvider } from "../context/ThemeContext";
import { ToastProvider } from "../context/ToastContext";
import { unaNotificacion } from "../test/notificacionFixture";
import { RoleGuard } from "./RoleGuard";
import { ShellLayout } from "./ShellLayout";

vi.mock("../api/notificacionesApi", () => ({ listarFallidas: vi.fn() }));
import * as notificacionesApi from "../api/notificacionesApi";

function stubMatchMedia(mobile: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("max-width") ? mobile : false,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    })),
  );
}

function sesion(usuario: Record<string, unknown>) {
  setToken("jwt");
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(usuario),
    } as Response),
  );
}

function montar(ruta = "/admin/hoy") {
  return render(
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <MemoryRouter initialEntries={[ruta]}>
            <Routes>
              <Route
                element={
                  <RoleGuard allowedRoles={["ADMIN", "SOCIO_PACIENTE", "PROFESIONAL"]}>
                    <ShellLayout />
                  </RoleGuard>
                }
              >
                <Route path="/admin/hoy" element={<PageHeader titulo="Pantalla" />} />
                <Route path="/socio/inicio" element={<PageHeader titulo="Pantalla socio" />} />
                <Route path="/profesional/agenda" element={<PageHeader titulo="Pantalla pro" />} />
              </Route>
              <Route path="/login" element={<div>login</div>} />
            </Routes>
          </MemoryRouter>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>,
  );
}

describe("ShellLayout", () => {
  beforeEach(() => {
    stubMatchMedia(false);
    vi.mocked(notificacionesApi.listarFallidas).mockResolvedValue([]);
    document.documentElement.removeAttribute("data-theme");
  });
  afterEach(() => vi.clearAllMocks());

  it("recepción con nombre: tarjeta con nombre, rol y navegación de ADMIN, y la pantalla activa", async () => {
    sesion({
      id: 1,
      email: "admin@vitalys.com",
      rol: "ADMIN",
      nombre: "Laura",
      apellido: "Benítez",
    });
    montar();

    expect(await screen.findByRole("heading", { name: "Pantalla" })).toBeInTheDocument();
    expect(screen.getByText("Laura Benítez")).toBeInTheDocument();
    expect(screen.getByText("LB")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ingreso al gimnasio" })).toHaveAttribute(
      "href",
      "/admin/ingreso",
    );
    expect(screen.queryByRole("link", { name: /Pagos y cuotas/ })).not.toBeInTheDocument();
  });

  it("sin nombre en /auth/me cae en rol + email", async () => {
    sesion({ id: 1, email: "admin@vitalys.com", rol: "ADMIN" });
    montar();

    expect(await screen.findByText("admin@vitalys.com")).toBeInTheDocument();
    expect(screen.getByText("AD")).toBeInTheDocument();
    expect(screen.getAllByText("Recepción").length).toBeGreaterThan(0);
  });

  it("el badge de 'Hoy en el centro' cuenta las notificaciones fallidas del ADMIN", async () => {
    vi.mocked(notificacionesApi.listarFallidas).mockResolvedValue([
      unaNotificacion(),
      unaNotificacion({ id: 2 }),
    ]);
    sesion({ id: 1, email: "admin@vitalys.com", rol: "ADMIN" });
    montar();

    expect(
      await screen.findByRole("link", { name: "Hoy en el centro, 2 notificaciones fallidas" }),
    ).toBeInTheDocument();
  });

  it("una sola fallida se lee en singular", async () => {
    vi.mocked(notificacionesApi.listarFallidas).mockResolvedValue([unaNotificacion()]);
    sesion({ id: 1, email: "admin@vitalys.com", rol: "ADMIN" });
    montar();

    expect(
      await screen.findByRole("link", { name: "Hoy en el centro, 1 notificación fallida" }),
    ).toBeInTheDocument();
  });

  it("el socio no consulta fallidas y ve su navegación", async () => {
    sesion({
      id: 5,
      email: "maria@mail.com",
      rol: "SOCIO_PACIENTE",
      nombre: "María",
      apellido: "Pérez",
    });
    montar("/socio/inicio");

    expect(await screen.findByRole("heading", { name: "Pantalla socio" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Mis turnos" })).toBeInTheDocument();
    expect(screen.getByText("Socio/a")).toBeInTheDocument();
    expect(notificacionesApi.listarFallidas).not.toHaveBeenCalled();
  });

  it("desktop muestra el chip de fecha y hora en la cabecera", async () => {
    sesion({ id: 1, email: "admin@vitalys.com", rol: "ADMIN" });
    montar();

    await screen.findByRole("heading", { name: "Pantalla" });
    expect(screen.getByText(/ · \d{2}:\d{2}$/)).toBeInTheDocument();
  });

  it("mobile: sin sidebar ni chip, con tab bar y header", async () => {
    stubMatchMedia(true);
    sesion({ id: 1, email: "admin@vitalys.com", rol: "ADMIN" });
    montar();

    await screen.findByRole("heading", { name: "Pantalla" });
    expect(screen.getByRole("button", { name: "Cambiar tema" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Profes." })).toBeInTheDocument();
    expect(screen.queryByText(/ · \d{2}:\d{2}$/)).not.toBeInTheDocument();
  });

  it("el botón de tema alterna data-theme y persiste la elección", async () => {
    sesion({ id: 7, email: "val@vitalys.com", rol: "PROFESIONAL" });
    montar("/profesional/agenda");

    await userEvent.click(await screen.findByRole("button", { name: "Modo oscuro" }));

    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(localStorage.getItem("vitalys_theme")).toBe("dark");
    expect(screen.getByRole("button", { name: "Modo claro" })).toBeInTheDocument();
  });

  it("Cerrar sesión descarta el token y vuelve al login", async () => {
    sesion({ id: 1, email: "admin@vitalys.com", rol: "ADMIN" });
    montar();

    await userEvent.click(await screen.findByRole("button", { name: "Cerrar sesión" }));

    await waitFor(() => expect(screen.getByText("login")).toBeInTheDocument());
    expect(localStorage.getItem("vitalys_token")).toBeNull();
  });
});
