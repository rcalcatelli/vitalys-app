import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getToken,
  getTokenAdmin,
  getTokenOperarComo,
  http,
  setToken,
  setTokenOperarComo,
} from "../api/http";
import { AuthProvider, useAuth } from "./AuthContext";
import { ToastProvider } from "./ToastContext";

function respuesta(status: number, body?: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response;
}

const ADMIN = {
  id: 1,
  email: "admin@vitalys.com",
  rol: "ADMIN",
  nombre: "Laura",
  apellido: "Benítez",
};
const SOCIO = {
  id: 11,
  email: "maria@mail.com",
  rol: "SOCIO_PACIENTE",
  nombre: "María",
  apellido: "Pérez",
  operadoPor: { usuarioId: 1, nombre: "Laura", apellido: "Benítez" },
};
const CREDENCIAL = {
  token: "jwt-operar-como",
  expiraEn: "2026-10-26T11:00:00-03:00",
  persona: { id: 7, nombre: "María", apellido: "Pérez" },
};

function Harness() {
  const { usuario, isLoading, operarComo, volverARecepcion, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="usuario">{usuario ? `${usuario.nombre} ${usuario.apellido}` : ""}</span>
      <span data-testid="rol">{usuario?.rol ?? ""}</span>
      <span data-testid="operador">{usuario?.operadoPor?.nombre ?? ""}</span>
      <button onClick={() => void operarComo(7).catch(() => undefined)}>operar</button>
      <button onClick={() => void volverARecepcion()}>volver</button>
      <button onClick={() => void http.get("/api/algo").catch(() => undefined)}>ping</button>
      <button
        onClick={() =>
          void Promise.all([http.get("/api/a"), http.get("/api/b")]).catch(() => undefined)
        }
      >
        ping doble
      </button>
      <button onClick={() => logout()}>salir</button>
      <button onClick={() => void login("admin@vitalys.com", "clave1234")}>login</button>
    </div>
  );
}

function montar() {
  return render(
    <ToastProvider>
      <AuthProvider>
        <Harness />
      </AuthProvider>
    </ToastProvider>,
  );
}

function autorizacion(init: RequestInit | undefined): string | undefined {
  const cabeceras = (init?.headers ?? {}) as Record<string, string>;
  return cabeceras.Authorization;
}

async function esperarSesion(nombre: string) {
  await waitFor(() => expect(screen.getByTestId("usuario")).toHaveTextContent(nombre));
}

describe("AuthContext: Operar como (RF-39)", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    setToken("jwt-admin");
  });

  it("operarComo guarda la credencial en la pestaña, gana sobre el token del ADMIN y pasa al socio", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch)
      .mockResolvedValueOnce(respuesta(200, ADMIN)) // /me al montar
      .mockResolvedValueOnce(respuesta(200, CREDENCIAL)) // POST /api/admin/operar-como
      .mockResolvedValueOnce(respuesta(200, SOCIO)); // /me con la credencial
    montar();
    await esperarSesion("Laura Benítez");

    await user.click(screen.getByText("operar"));
    await esperarSesion("María Pérez");

    expect(screen.getByTestId("operador")).toHaveTextContent("Laura");
    expect(getTokenOperarComo()).toBe("jwt-operar-como");
    expect(getTokenAdmin()).toBe("jwt-admin");
    expect(getToken()).toBe("jwt-operar-como");
    const [url, init] = vi.mocked(fetch).mock.calls[1];
    expect(url).toBe("/api/admin/operar-como");
    expect(autorizacion(init)).toBe("Bearer jwt-admin");
    expect(JSON.parse(init?.body as string)).toEqual({ personaId: 7 });
    const [, meInit] = vi.mocked(fetch).mock.calls[2];
    expect(autorizacion(meInit)).toBe("Bearer jwt-operar-como");
  });

  it("si /me falla con la credencial nueva, la descarta y sigue como ADMIN", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch)
      .mockResolvedValueOnce(respuesta(200, ADMIN))
      .mockResolvedValueOnce(respuesta(200, CREDENCIAL))
      .mockResolvedValueOnce(respuesta(500, { message: "boom" }));
    montar();
    await esperarSesion("Laura Benítez");

    await user.click(screen.getByText("operar"));

    await waitFor(() => expect(getTokenOperarComo()).toBeNull());
    expect(screen.getByTestId("usuario")).toHaveTextContent("Laura Benítez");
    expect(getToken()).toBe("jwt-admin");
    // La sesión abierta en el servidor no queda colgada: se avisa el fin con la credencial.
    const [fin, finInit] = vi.mocked(fetch).mock.calls[3];
    expect(fin).toBe("/api/operar-como/fin");
    expect(autorizacion(finInit)).toBe("Bearer jwt-operar-como");
  });

  it("volverARecepcion avisa al servidor, descarta la credencial y recupera al ADMIN sin nuevo login", async () => {
    const user = userEvent.setup();
    setTokenOperarComo("jwt-operar-como");
    vi.mocked(fetch)
      .mockResolvedValueOnce(respuesta(200, SOCIO)) // /me al montar (recarga: el banner persiste)
      .mockResolvedValueOnce(respuesta(204)) // POST /api/operar-como/fin
      .mockResolvedValueOnce(respuesta(200, ADMIN));
    montar();
    await esperarSesion("María Pérez");
    expect(screen.getByTestId("operador")).toHaveTextContent("Laura");

    await user.click(screen.getByText("volver"));
    await esperarSesion("Laura Benítez");

    const [fin, finInit] = vi.mocked(fetch).mock.calls[1];
    expect(fin).toBe("/api/operar-como/fin");
    expect(autorizacion(finInit)).toBe("Bearer jwt-operar-como");
    expect(getTokenOperarComo()).toBeNull();
    expect(screen.getByTestId("operador")).toHaveTextContent("");
    expect(screen.getByTestId("rol")).toHaveTextContent("ADMIN");
  });

  it("cerrar sesión operando como un socio avisa el fin con la credencial y descarta todo", async () => {
    const user = userEvent.setup();
    setTokenOperarComo("jwt-operar-como");
    vi.mocked(fetch)
      .mockResolvedValueOnce(respuesta(200, SOCIO))
      .mockResolvedValueOnce(respuesta(204));
    montar();
    await esperarSesion("María Pérez");

    await user.click(screen.getByText("salir"));

    await waitFor(() => expect(screen.getByTestId("usuario")).toHaveTextContent(""));
    const [fin, finInit] = vi.mocked(fetch).mock.calls[1];
    expect(fin).toBe("/api/operar-como/fin");
    expect(autorizacion(finInit)).toBe("Bearer jwt-operar-como");
    expect(getToken()).toBeNull();
    expect(getTokenOperarComo()).toBeNull();
  });

  it("cerrar sesión cierra igual si el aviso del fin falla", async () => {
    const user = userEvent.setup();
    setTokenOperarComo("jwt-operar-como");
    vi.mocked(fetch)
      .mockResolvedValueOnce(respuesta(200, SOCIO))
      .mockRejectedValueOnce(new Error("sin red"));
    montar();
    await esperarSesion("María Pérez");

    await user.click(screen.getByText("salir"));

    await waitFor(() => expect(screen.getByTestId("usuario")).toHaveTextContent(""));
    expect(getToken()).toBeNull();
  });

  it("cerrar sesión sin operar como no llama a /fin", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValueOnce(respuesta(200, ADMIN));
    montar();
    await esperarSesion("Laura Benítez");

    await user.click(screen.getByText("salir"));

    await waitFor(() => expect(screen.getByTestId("usuario")).toHaveTextContent(""));
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
  });

  it("volverARecepcion igual vuelve si el aviso al servidor falla", async () => {
    const user = userEvent.setup();
    setTokenOperarComo("jwt-operar-como");
    vi.mocked(fetch)
      .mockResolvedValueOnce(respuesta(200, SOCIO))
      .mockRejectedValueOnce(new Error("sin red"))
      .mockResolvedValueOnce(respuesta(200, ADMIN));
    montar();
    await esperarSesion("María Pérez");

    await user.click(screen.getByText("volver"));

    await esperarSesion("Laura Benítez");
    expect(getTokenOperarComo()).toBeNull();
  });

  it("sin sesión de ADMIN que recuperar, volver deja la sesión cerrada", async () => {
    const user = userEvent.setup();
    localStorage.clear();
    setTokenOperarComo("jwt-operar-como");
    vi.mocked(fetch)
      .mockResolvedValueOnce(respuesta(200, SOCIO))
      .mockResolvedValueOnce(respuesta(204));
    montar();
    await esperarSesion("María Pérez");

    await user.click(screen.getByText("volver"));

    await waitFor(() => expect(screen.getByTestId("usuario")).toHaveTextContent(/^$/));
    expect(getToken()).toBeNull();
  });

  it("si el ADMIN ya no es válido al volver, la sesión se cierra", async () => {
    const user = userEvent.setup();
    setTokenOperarComo("jwt-operar-como");
    vi.mocked(fetch)
      .mockResolvedValueOnce(respuesta(200, SOCIO))
      .mockResolvedValueOnce(respuesta(204))
      .mockResolvedValueOnce(respuesta(401, { message: "vencido" }));
    montar();
    await esperarSesion("María Pérez");

    await user.click(screen.getByText("volver"));

    await waitFor(() => expect(screen.getByTestId("usuario")).toHaveTextContent(/^$/));
    expect(getTokenAdmin()).toBeNull();
  });

  it("un 401 con la credencial restaura la sesión del ADMIN y avisa con un toast", async () => {
    const user = userEvent.setup();
    setTokenOperarComo("jwt-operar-como");
    vi.mocked(fetch)
      .mockResolvedValueOnce(respuesta(200, SOCIO))
      .mockResolvedValueOnce(respuesta(401, { message: "vencida" })) // ping con la credencial
      .mockResolvedValueOnce(respuesta(200, ADMIN)); // /me del ADMIN
    montar();
    await esperarSesion("María Pérez");

    await user.click(screen.getByText("ping"));

    await esperarSesion("Laura Benítez");
    expect(getTokenOperarComo()).toBeNull();
    expect(await screen.findByRole("status")).toHaveTextContent(
      "La sesión como María Pérez venció",
    );
  });

  it("varios 401 seguidos restauran una sola vez", async () => {
    const user = userEvent.setup();
    setTokenOperarComo("jwt-operar-como");
    vi.mocked(fetch)
      .mockResolvedValueOnce(respuesta(200, SOCIO))
      .mockResolvedValueOnce(respuesta(401))
      .mockResolvedValueOnce(respuesta(401))
      .mockResolvedValueOnce(respuesta(200, ADMIN));
    montar();
    await esperarSesion("María Pérez");

    await user.click(screen.getByText("ping doble"));

    await esperarSesion("Laura Benítez");
    expect(vi.mocked(fetch).mock.calls.filter(([u]) => u === "/api/auth/me")).toHaveLength(2);
    expect(await screen.findAllByRole("status")).toHaveLength(1);
  });

  it("si la credencial ya venció al recargar, vuelve al ADMIN en vez de cerrar la sesión", async () => {
    setTokenOperarComo("jwt-vencida");
    vi.mocked(fetch)
      .mockResolvedValueOnce(respuesta(401, { message: "vencida" })) // /me con la credencial
      .mockResolvedValueOnce(respuesta(200, ADMIN)); // /me del ADMIN
    montar();

    await esperarSesion("Laura Benítez");
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
    expect(getTokenOperarComo()).toBeNull();
    expect(getTokenAdmin()).toBe("jwt-admin");
    expect(await screen.findByRole("status")).toHaveTextContent("La sesión de Operar como venció");
  });

  it("un login nuevo nunca manda la credencial de Operar como y la descarta", async () => {
    const user = userEvent.setup();
    localStorage.clear();
    setTokenOperarComo("jwt-colgada");
    vi.mocked(fetch)
      .mockResolvedValueOnce(respuesta(200, SOCIO))
      .mockResolvedValueOnce(respuesta(200, { token: "jwt-nuevo" }))
      .mockResolvedValueOnce(respuesta(200, ADMIN));
    montar();
    await esperarSesion("María Pérez");

    await user.click(screen.getByText("login"));

    await esperarSesion("Laura Benítez");
    const [url, init] = vi.mocked(fetch).mock.calls[1];
    expect(url).toBe("/api/auth/login");
    expect(autorizacion(init)).toBeUndefined();
    expect(getTokenOperarComo()).toBeNull();
    expect(getToken()).toBe("jwt-nuevo");
  });
});
