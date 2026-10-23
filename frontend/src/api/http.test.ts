import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ApiError,
  clearToken,
  getToken,
  getTokenAdmin,
  getTokenOperarComo,
  http,
  onOperarComoVencido,
  setToken,
  setTokenOperarComo,
} from "./http";

function jsonResponse(status: number, body?: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response;
}

describe("http", () => {
  beforeEach(() => {
    clearToken();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("adjunta Authorization: Bearer <token> cuando hay token guardado", async () => {
    setToken("un-jwt-valido");
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, { ok: true }));

    await http.get("/api/auth/me");

    const [, init] = vi.mocked(fetch).mock.calls[0];
    const headers = init?.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer un-jwt-valido");
  });

  it("no adjunta Authorization cuando no hay token guardado", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, { ok: true }));

    await http.get("/api/auth/me");

    const [, init] = vi.mocked(fetch).mock.calls[0];
    const headers = init?.headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
  });

  it("no adjunta Authorization en un request explícitamente público (auth=false)", async () => {
    setToken("un-jwt-valido");
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, { token: "x" }));

    await http.post("/api/auth/login", { email: "a@a.com", contrasena: "12345678" }, false);

    const [, init] = vi.mocked(fetch).mock.calls[0];
    const headers = init?.headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
  });

  it("lanza ApiError con el status y el mensaje del backend ante una respuesta de error", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse(409, { message: "El email ya está registrado" }),
    );

    await expect(http.post("/api/auth/registro", {}, false)).rejects.toMatchObject({
      status: 409,
      message: "El email ya está registrado",
    });
  });

  it("usa un mensaje genérico si el body de error no trae `message`", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error("no es JSON")),
    } as Response);

    await expect(http.get("/api/auth/me")).rejects.toMatchObject({
      status: 500,
      message: "Error 500",
    });
  });

  it("ApiError conserva el status recibido", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse(401, { message: "Credenciales inválidas" }),
    );

    try {
      await http.get("/api/auth/me");
      expect.unreachable("debía lanzar");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).status).toBe(401);
    }
  });
  it("ApiError conserva el body de la respuesta de error (p. ej. el impacto de un 409)", async () => {
    const impacto = { cantidad: 1, turnos: [] };
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(409, { message: "Hay turnos", impacto }));

    await expect(http.delete("/api/profesionales/1")).rejects.toMatchObject({
      status: 409,
      body: { impacto },
    });
  });

  it("delete usa el método DELETE y devuelve undefined ante un 204", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(204));

    await expect(http.delete("/api/profesionales/1/disponibilidad/2")).resolves.toBeUndefined();

    const [, init] = vi.mocked(fetch).mock.calls[0];
    expect(init?.method).toBe("DELETE");
  });
});

describe("http: credencial de Operar como", () => {
  beforeEach(() => {
    clearToken();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("la credencial de la pestaña gana sobre el token del ADMIN", async () => {
    setToken("jwt-admin");
    setTokenOperarComo("jwt-operar-como");
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, {}));

    await http.get("/api/auth/me");

    const headers = vi.mocked(fetch).mock.calls[0][1]?.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer jwt-operar-como");
    expect(getTokenAdmin()).toBe("jwt-admin");
  });

  it("clearToken descarta las dos credenciales", () => {
    setToken("jwt-admin");
    setTokenOperarComo("jwt-operar-como");
    clearToken();
    expect(getToken()).toBeNull();
    expect(getTokenOperarComo()).toBeNull();
  });

  it("un 401 hecho con la credencial avisa a quien la registró", async () => {
    const alVencer = vi.fn();
    const desregistrar = onOperarComoVencido(alVencer);
    setToken("jwt-admin");
    setTokenOperarComo("jwt-operar-como");
    vi.mocked(fetch).mockResolvedValue(jsonResponse(401, { message: "vencida" }));

    await expect(http.get("/api/turnos/mis-turnos")).rejects.toMatchObject({ status: 401 });
    expect(alVencer).toHaveBeenCalledTimes(1);

    desregistrar();
    await expect(http.get("/api/turnos/mis-turnos")).rejects.toMatchObject({ status: 401 });
    expect(alVencer).toHaveBeenCalledTimes(1);
  });

  it("un 401 sin credencial de Operar como, o de una request pública, no avisa", async () => {
    const alVencer = vi.fn();
    const desregistrar = onOperarComoVencido(alVencer);
    vi.mocked(fetch).mockResolvedValue(jsonResponse(401, { message: "x" }));

    setToken("jwt-admin");
    await expect(http.get("/api/auth/me")).rejects.toMatchObject({ status: 401 });

    setTokenOperarComo("jwt-operar-como");
    await expect(http.post("/api/auth/login", {}, false)).rejects.toMatchObject({ status: 401 });
    expect(alVencer).not.toHaveBeenCalled();
    desregistrar();
  });

  it("desregistrar un callback viejo no pisa al nuevo", async () => {
    const primero = vi.fn();
    const segundo = vi.fn();
    const desregistrarPrimero = onOperarComoVencido(primero);
    const desregistrarSegundo = onOperarComoVencido(segundo);
    desregistrarPrimero();
    setTokenOperarComo("jwt-operar-como");
    vi.mocked(fetch).mockResolvedValue(jsonResponse(401));

    await expect(http.get("/api/x")).rejects.toMatchObject({ status: 401 });
    expect(segundo).toHaveBeenCalledTimes(1);
    desregistrarSegundo();
  });
});
