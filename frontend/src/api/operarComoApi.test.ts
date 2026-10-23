import { beforeEach, describe, expect, it, vi } from "vitest";
import { autorizarExcepcion } from "./excepcionesApi";
import { iniciarOperarComo, terminarOperarComo } from "./operarComoApi";
import { listarTurnos } from "./turnosApi";

function ok(status: number, body?: unknown): Response {
  return { ok: true, status, json: () => Promise.resolve(body) } as Response;
}

describe("operarComoApi / excepcionesApi / turnosApi", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(ok(200, {})));
  });

  it("inicia Operar como con POST /api/admin/operar-como y la persona", async () => {
    await iniciarOperarComo(7);
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe("/api/admin/operar-como");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(init?.body as string)).toEqual({ personaId: 7 });
  });

  it("termina Operar como con POST /api/operar-como/fin y respuesta vacía", async () => {
    vi.mocked(fetch).mockResolvedValue(ok(204));
    await expect(terminarOperarComo()).resolves.toBeUndefined();
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe("/api/operar-como/fin");
    expect(init?.method).toBe("POST");
  });

  it("autoriza una excepción con POST /api/excepciones-morosidad", async () => {
    const pedido = { personaId: 3, motivo: "x", validaHasta: "2026-11-05", unSoloUso: false };
    await autorizarExcepcion(pedido);
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe("/api/excepciones-morosidad");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(init?.body as string)).toEqual(pedido);
  });

  it("lista turnos filtrando también por día", async () => {
    await listarTurnos({ tipo: "GYM", fecha: "2026-10-26" });
    expect(vi.mocked(fetch).mock.calls[0][0]).toBe("/api/turnos?tipo=GYM&fecha=2026-10-26");
  });
});
