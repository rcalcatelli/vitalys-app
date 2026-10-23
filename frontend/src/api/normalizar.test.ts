import { describe, expect, it } from "vitest";
import type { EstadoCuenta } from "../types/pago";
import type { Persona } from "../types/persona";
import type { Turno } from "../types/turno";
import type { Usuario } from "../types/auth";
import {
  normalizarEstadoCuenta,
  normalizarPersona,
  normalizarProximaAgenda,
  normalizarTurno,
  normalizarUsuario,
} from "./normalizar";

describe("normalizar", () => {
  it("persona: completa cuota, especialidades y tieneUsuarioSocio", () => {
    const p = normalizarPersona({ id: 1 } as unknown as Persona);
    expect(p).toMatchObject({ cuota: null, especialidades: [], tieneUsuarioSocio: false });
  });

  it("turno: separa 'Apellido, Nombre' y completa los booleanos", () => {
    const t = normalizarTurno({ id: 1, persona: "García, Juan" } as unknown as Turno);
    expect(t).toMatchObject({
      personaNombre: "Juan",
      personaApellido: "García",
      completadoEn: null,
      reservadoPorRecepcion: false,
      canceladoPorRecepcion: false,
    });
    expect(t.personaDni).toBeUndefined();
  });

  it("turno: no pisa lo que sí viene", () => {
    const t = normalizarTurno({
      persona: "X, Y",
      personaNombre: "Juan",
      personaApellido: "García",
      reservadoPorRecepcion: true,
    } as unknown as Turno);
    expect(t.personaNombre).toBe("Juan");
    expect(t.reservadoPorRecepcion).toBe(true);
  });

  it("estado de cuenta: sesiones sin profesional ni especialidad y sin totales", () => {
    const e = normalizarEstadoCuenta({
      sesiones: [{ pagoId: 1, turnoId: 2, monto: 5 }],
    } as unknown as EstadoCuenta);
    expect(e.sesiones[0]).toMatchObject({
      profesional: null,
      especialidad: null,
      fechaTurno: null,
    });
    expect(e.periodos).toEqual([]);
    expect(e.excepcion).toBeNull();
    expect(e.totales).toEqual({ cantidadPagos: 0, montoTotal: 0 });
  });

  it("estado de cuenta: período sin pago", () => {
    const e = normalizarEstadoCuenta({
      periodos: [{ periodo: "2026-10-01" }],
    } as unknown as EstadoCuenta);
    expect(e.periodos[0].pago).toBeNull();
  });

  it("usuario: nombre, apellido y operadoPor nulos", () => {
    const u = normalizarUsuario({ id: 1 } as unknown as Usuario);
    expect(u).toMatchObject({ nombre: null, apellido: null, operadoPor: null });
  });

  it("proxima agenda: fecha y libres por defecto", () => {
    expect(normalizarProximaAgenda([{ profesionalId: 1 } as never])[0]).toMatchObject({
      fecha: null,
      libres: 0,
    });
  });
});
