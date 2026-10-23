import type { Usuario } from "../types/auth";
import type { EstadoCuenta } from "../types/pago";
import type { Persona } from "../types/persona";
import type { ProximaAgenda, Turno } from "../types/turno";

/**
 * Normalizadores de respuestas. Un backend desplegado antes que el frontend puede omitir los campos
 * agregados después: acá se completan con valores neutros para que las pantallas no revienten.
 */

export function normalizarPersona(p: Persona): Persona {
  return {
    ...p,
    cuota: p.cuota ?? null,
    especialidades: p.especialidades ?? [],
    tieneUsuarioSocio: p.tieneUsuarioSocio ?? false,
  };
}

export function normalizarPersonas(lista: Persona[]): Persona[] {
  return (Array.isArray(lista) ? lista : []).map(normalizarPersona);
}

export function normalizarTurno(t: Turno): Turno {
  // `persona` llega como "Apellido, Nombre": sirve de respaldo si faltan los campos separados.
  const [apellidoJunto = "", nombreJunto = ""] = (t.persona ?? "").split(",").map((s) => s.trim());
  return {
    ...t,
    personaNombre: t.personaNombre ?? nombreJunto,
    personaApellido: t.personaApellido ?? apellidoJunto,
    completadoEn: t.completadoEn ?? null,
    canceladoEn: t.canceladoEn ?? null,
    motivoCancelacion: t.motivoCancelacion ?? null,
    reservadoPorRecepcion: t.reservadoPorRecepcion ?? false,
    canceladoPorRecepcion: t.canceladoPorRecepcion ?? false,
  };
}

export function normalizarTurnos(lista: Turno[]): Turno[] {
  return (Array.isArray(lista) ? lista : []).map(normalizarTurno);
}

export function normalizarEstadoCuenta(e: EstadoCuenta): EstadoCuenta {
  return {
    ...e,
    excepcion: e.excepcion ?? null,
    periodos: (e.periodos ?? []).map((p) => ({ ...p, pago: p.pago ?? null })),
    sesiones: (e.sesiones ?? []).map((s) => ({
      ...s,
      fechaTurno: s.fechaTurno ?? null,
      profesional: s.profesional ?? null,
      especialidad: s.especialidad ?? null,
    })),
    totales: e.totales ?? { cantidadPagos: 0, montoTotal: 0 },
  };
}

export function normalizarUsuario(u: Usuario): Usuario {
  return {
    ...u,
    nombre: u.nombre ?? null,
    apellido: u.apellido ?? null,
    operadoPor: u.operadoPor ?? null,
    operarComoExpiraEn: u.operarComoExpiraEn ?? null,
  };
}

export function normalizarProximaAgenda(lista: ProximaAgenda[]): ProximaAgenda[] {
  return (Array.isArray(lista) ? lista : []).map((a) => ({
    ...a,
    fecha: a.fecha ?? null,
    libres: a.libres ?? 0,
  }));
}
