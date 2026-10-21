import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "./http";
import {
  actualizarProfesional,
  crearProfesional,
  darDeBajaProfesional,
  reactivar,
  impactoDeBaja,
  impactoDeDisponibilidad,
  impactoDeError,
  listarFranjas,
  listarProfesionales,
  miPerfilProfesional,
  obtenerProfesional,
  reemplazarDisponibilidad,
} from "./profesionalesApi";

function ok(body: unknown): Response {
  return { ok: true, status: 200, json: () => Promise.resolve(body) } as Response;
}

const datos = {
  nombre: "Ana",
  apellido: "Paz",
  especialidad: "NUTRICION",
  duracionTurnoMinutos: 30,
} as const;

describe("profesionalesApi", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(ok([])));
  });

  function ultimaLlamada() {
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    return { url: String(url), method: init?.method, body: init?.body };
  }

  it.each([
    ["listarProfesionales", () => listarProfesionales(), "GET", "/api/profesionales"],
    ["miPerfilProfesional", () => miPerfilProfesional(), "GET", "/api/profesionales/me"],
    ["obtenerProfesional", () => obtenerProfesional(3), "GET", "/api/profesionales/3"],
    ["impactoDeBaja", () => impactoDeBaja(3), "GET", "/api/profesionales/3/baja/impacto"],
    [
      "darDeBajaProfesional sin confirmar",
      () => darDeBajaProfesional(3, false),
      "DELETE",
      "/api/profesionales/3?confirmar=false",
    ],
    [
      "darDeBajaProfesional confirmando",
      () => darDeBajaProfesional(3, true),
      "DELETE",
      "/api/profesionales/3?confirmar=true",
    ],
    ["reactivar", () => reactivar(3), "PATCH", "/api/profesionales/3/reactivar"],
    ["listarFranjas", () => listarFranjas(3), "GET", "/api/profesionales/3/disponibilidad"],
  ])("%s", async (_nombre, llamar, method, url) => {
    await llamar();
    expect(ultimaLlamada()).toMatchObject({ url, method });
  });

  it("crearProfesional hace POST con credenciales y datos", async () => {
    await crearProfesional({ email: "a@vitalys.com", contrasena: "Clave1234", datos });
    expect(ultimaLlamada()).toMatchObject({ url: "/api/profesionales", method: "POST" });
    expect(JSON.parse(String(ultimaLlamada().body))).toEqual({
      email: "a@vitalys.com",
      contrasena: "Clave1234",
      datos,
    });
  });

  it("actualizarProfesional hace PUT con los datos", async () => {
    await actualizarProfesional(3, datos);
    expect(ultimaLlamada()).toMatchObject({ url: "/api/profesionales/3", method: "PUT" });
  });

  it("impactoDeDisponibilidad envía el conjunto propuesto como { franjas }", async () => {
    const franjas = [{ diaSemana: 1, horaInicio: "09:00", horaFin: "12:00" }];
    await impactoDeDisponibilidad(3, franjas);
    expect(ultimaLlamada()).toMatchObject({
      url: "/api/profesionales/3/disponibilidad/impacto",
      method: "POST",
    });
    expect(JSON.parse(String(ultimaLlamada().body))).toEqual({ franjas });
  });

  it("reemplazarDisponibilidad hace PUT con el flag confirmar", async () => {
    await reemplazarDisponibilidad(3, [], true);
    expect(ultimaLlamada()).toMatchObject({
      url: "/api/profesionales/3/disponibilidad?confirmar=true",
      method: "PUT",
    });
  });
});

describe("impactoDeError", () => {
  const impacto = { cantidad: 1, turnos: [] };

  it("extrae el impacto de un 409", () => {
    expect(impactoDeError(new ApiError(409, "x", { impacto }))).toEqual(impacto);
  });

  it("devuelve null si el 409 no trae impacto (p. ej. solapamiento)", () => {
    expect(impactoDeError(new ApiError(409, "Se superpone"))).toBeNull();
  });

  it("devuelve null para otros status o errores que no son ApiError", () => {
    expect(impactoDeError(new ApiError(400, "x", { impacto }))).toBeNull();
    expect(impactoDeError(new Error("boom"))).toBeNull();
  });
});
