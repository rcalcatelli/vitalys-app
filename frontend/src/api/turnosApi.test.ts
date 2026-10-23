import { afterEach, describe, expect, it, vi } from "vitest";
import * as api from "./turnosApi";

function stub() {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({}) }),
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("turnosApi", () => {
  it.each<[string, () => Promise<unknown>, string, string, unknown?]>([
    ["cupoGym", () => api.cupoGym("2026-10-26"), "GET", "/api/turnos/gym/cupo?fecha=2026-10-26"],
    ["estadoGym", () => api.estadoGym(), "GET", "/api/turnos/gym/estado"],
    [
      "slotsDisponibles",
      () => api.slotsDisponibles(3, "2026-10-28"),
      "GET",
      "/api/turnos/disponibles?profesionalId=3&fecha=2026-10-28",
    ],
    ["misTurnos", () => api.misTurnos(), "GET", "/api/turnos/mis-turnos"],
    ["proximaAgenda", () => api.proximaAgenda(), "GET", "/api/turnos/consultorio/proxima-agenda"],
    ["miAgenda sin rango", () => api.miAgenda(), "GET", "/api/turnos/mi-agenda"],
    [
      "miAgenda con rango",
      () => api.miAgenda("2026-10-26", "2026-11-02"),
      "GET",
      "/api/turnos/mi-agenda?desde=2026-10-26&hasta=2026-11-02",
    ],
    [
      "reservarGym",
      () => api.reservarGym("2026-10-26T10:00:00-03:00"),
      "POST",
      "/api/turnos/gym",
      { inicio: "2026-10-26T10:00:00-03:00" },
    ],
    [
      "reservarConsultorio",
      () => api.reservarConsultorio(3, "2026-10-28T09:00:00-03:00"),
      "POST",
      "/api/turnos",
      { profesionalId: 3, inicio: "2026-10-28T09:00:00-03:00" },
    ],
    [
      "cancelarTurno",
      () => api.cancelarTurno(9, "Viaje"),
      "PATCH",
      "/api/turnos/9/cancelar",
      { motivo: "Viaje" },
    ],
    ["marcarCompletado", () => api.marcarCompletado(9), "PATCH", "/api/turnos/9/completado"],
    ["marcarAusente", () => api.marcarAusente(9), "PATCH", "/api/turnos/9/ausente"],
    [
      "listarTurnos con persona y tipo",
      () => api.listarTurnos({ personaId: 3, tipo: "CONSULTORIO" }),
      "GET",
      "/api/turnos?personaId=3&tipo=CONSULTORIO",
    ],
    ["listarTurnos sin filtro", () => api.listarTurnos({}), "GET", "/api/turnos"],
  ])("%s", async (_nombre, ejecutar, method, url, body) => {
    stub();
    await ejecutar();
    const [pedida, init] = vi.mocked(fetch).mock.calls[0];
    expect(init?.method).toBe(method);
    expect(String(pedida)).toBe(url);
    if (body) expect(JSON.parse(String(init?.body))).toEqual(body);
  });
});
