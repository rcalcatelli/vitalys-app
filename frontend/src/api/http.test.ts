import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, clearToken, http, setToken } from "./http";

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
});
