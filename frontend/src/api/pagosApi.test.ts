import { afterEach, describe, expect, it, vi } from "vitest";
import * as api from "./pagosApi";

function stub() {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({}) }),
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("pagosApi", () => {
  it.each<[string, () => Promise<unknown>, string, string, unknown?]>([
    ["miEstadoCuenta", () => api.miEstadoCuenta(), "GET", "/api/pagos/mi-estado-cuenta"],
    ["estadoCuentaDe", () => api.estadoCuentaDe(7), "GET", "/api/pagos/persona/7/estado-cuenta"],
    [
      "registrarPago",
      () =>
        api.registrarPago({
          personaId: 7,
          concepto: "CUOTA_MENSUAL",
          monto: 15000,
          medio: "EFECTIVO",
          periodo: "2026-10-01",
        }),
      "POST",
      "/api/pagos",
      {
        personaId: 7,
        concepto: "CUOTA_MENSUAL",
        monto: 15000,
        medio: "EFECTIVO",
        periodo: "2026-10-01",
      },
    ],
  ])("%s", async (_nombre, ejecutar, method, url, body) => {
    stub();
    await ejecutar();
    const [pedida, init] = vi.mocked(fetch).mock.calls[0];
    expect(init?.method).toBe(method);
    expect(String(pedida)).toBe(url);
    if (body) expect(JSON.parse(String(init?.body))).toEqual(body);
  });
});
