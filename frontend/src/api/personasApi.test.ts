import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  actualizarPersona,
  construirQuery,
  crearPersona,
  darDeBajaPersona,
  listarPersonas,
  reactivarPersona,
  vincularPersona,
} from "./personasApi";

function ok(body: unknown): Response {
  return { ok: true, status: 200, json: () => Promise.resolve(body) } as Response;
}

describe("construirQuery", () => {
  it.each([
    ["TODOS", "", ""],
    ["CON_DEUDA", "", "?conDeuda=true"],
    ["CONSULTORIO", " gómez ", "?q=g%C3%B3mez"],
    ["GYM", "381", "?soloGym=true&q=381"],
  ] as const)("%s + '%s' → '%s'", (filtro, texto, esperado) => {
    expect(construirQuery(filtro, texto)).toBe(esperado);
  });
});

describe("personasApi", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(ok([])));
  });

  it("lista con los filtros como query params", async () => {
    await listarPersonas("CON_DEUDA", "juan");
    expect(vi.mocked(fetch).mock.calls[0][0]).toBe("/api/personas?conDeuda=true&q=juan");
  });

  it("usa el verbo y la ruta de cada operación", async () => {
    const datos = {
      nombre: "A",
      apellido: "B",
      dni: "1234567",
      telefono: null,
      fechaNacimiento: null,
      esSocioGym: false,
      fechaInicioMembresia: null,
    };
    await crearPersona({ email: "a@b.c", contrasena: "12345678", datos });
    await actualizarPersona(4, datos);
    await darDeBajaPersona(4);
    await reactivarPersona(4);
    await vincularPersona({ email: "a@b.c", datos });

    const llamadas = vi.mocked(fetch).mock.calls.map(([url, init]) => `${init?.method} ${url}`);
    expect(llamadas).toEqual([
      "POST /api/personas",
      "PUT /api/personas/4",
      "PATCH /api/personas/4/baja",
      "PATCH /api/personas/4/reactivar",
      "POST /api/personas/vincular",
    ]);
  });
});
