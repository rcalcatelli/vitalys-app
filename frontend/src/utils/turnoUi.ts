import type { Profesional } from "../types/profesional";
import type { Turno } from "../types/turno";
import { fechaBA } from "./fechaBA";
import { abreviaturaDia, fechaCorta } from "./diasUi";
import { etiquetaEspecialidad, nombreProfesional } from "./formato";

/** Etiqueta cuando el profesional ya no figura (baja) y no se puede resolver su nombre. */
export const PROFESIONAL_NO_DISPONIBLE = "Profesional no disponible";

/** Anticipación mínima para cancelar en término: 2 h en gimnasio, 24 h en consultorio. */
export function limiteCancelacionHoras(turno: Pick<Turno, "tipoTurno">): number {
  return turno.tipoTurno === "GYM" ? 2 : 24;
}

/** Servicio y responsable de un turno: "Gimnasio" o "Consulta de {especialidad}" + nombre. */
export function describirTurno(
  turno: Pick<Turno, "tipoTurno" | "profesionalId">,
  profesionales: Profesional[],
): { servicio: string; quien: string } {
  if (turno.tipoTurno === "GYM") return { servicio: "Gimnasio", quien: "" };
  const profesional = profesionales.find((p) => p.id === turno.profesionalId);
  return profesional
    ? {
        servicio: `Consulta de ${etiquetaEspecialidad(profesional.especialidad)}`,
        quien: nombreProfesional(profesional),
      }
    : { servicio: "Consulta", quien: PROFESIONAL_NO_DISPONIBLE };
}

/** `2026-10-26T10:00:00-03:00` → `Lun 26/10`. */
export function diaCorto(inicio: string): string {
  const fecha = fechaBA(inicio);
  return `${abreviaturaDia(fecha)} ${fechaCorta(fecha)}`;
}

/** Texto que acompaña a un turno de gimnasio en las tablas del socio. */
export const SALA_GIMNASIO = "Sala de entrenamiento · 60 min";

/**
 * Servicio y detalle del turno como lo muestra el diseño en Inicio y Mis turnos: "Gimnasio" con la
 * sala, o la especialidad con el nombre del profesional.
 */
export function servicioDeTurno(
  turno: Pick<Turno, "tipoTurno" | "profesionalId">,
  profesionales: Profesional[],
): { servicio: string; quien: string } {
  if (turno.tipoTurno === "GYM") return { servicio: "Gimnasio", quien: SALA_GIMNASIO };
  const profesional = profesionales.find((p) => p.id === turno.profesionalId);
  return profesional
    ? {
        servicio: etiquetaEspecialidad(profesional.especialidad),
        quien: nombreProfesional(profesional),
      }
    : { servicio: "Consulta", quien: PROFESIONAL_NO_DISPONIBLE };
}

/** "Reservado por Recepción" / "Cancelado por Recepción" cuando Recepción operó el turno (RN-27). */
export function marcaRecepcion(
  turno: Pick<Turno, "reservadoPorRecepcion" | "canceladoPorRecepcion">,
): string | null {
  if (turno.canceladoPorRecepcion) return "Cancelado por Recepción";
  if (turno.reservadoPorRecepcion) return "Reservado por Recepción";
  return null;
}
