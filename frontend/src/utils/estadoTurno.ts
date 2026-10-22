import type { EstadoTurno } from "../types/turno";

/** Tonos del design system para los chips de estado (`neu` es el neutro). */
export type TonoChip = "ok" | "warn" | "bad" | "neu" | "clin";

const ETIQUETA: Record<EstadoTurno, string> = {
  RESERVADO: "Reservado",
  COMPLETADO: "Completado",
  AUSENTE: "Ausente",
  CANCELADO_EN_TIEMPO: "Cancelado en término",
  CANCELADO_TARDE: "Cancelado fuera de término",
  CANCELADO_POR_PROFESIONAL: "Cancelado por el centro",
};

const TONO: Record<EstadoTurno, TonoChip> = {
  RESERVADO: "clin",
  COMPLETADO: "ok",
  AUSENTE: "bad",
  CANCELADO_EN_TIEMPO: "neu",
  CANCELADO_TARDE: "warn",
  CANCELADO_POR_PROFESIONAL: "neu",
};

/**
 * Etiqueta del estado. En la agenda del profesional un turno COMPLETADO se muestra como
 * "Atendido" (`vistaProfesional`), igual que el diseño.
 */
export function etiquetaEstado(estado: EstadoTurno, vistaProfesional = false): string {
  return vistaProfesional && estado === "COMPLETADO" ? "Atendido" : ETIQUETA[estado];
}

export function tonoEstado(estado: EstadoTurno): TonoChip {
  return TONO[estado];
}

export function estaCancelado(estado: EstadoTurno): boolean {
  return estado.startsWith("CANCELADO");
}
