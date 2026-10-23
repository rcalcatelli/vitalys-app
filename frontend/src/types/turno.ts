import type { Especialidad } from "./profesional";

// Contrato real del Módulo 4 (turnos). Espeja los DTOs del backend; los instantes llegan como
// ISO-8601 con offset de Buenos Aires (`2026-10-26T10:00:00-03:00`).
export type TipoTurno = "CONSULTORIO" | "GYM";

export type EstadoTurno =
  | "RESERVADO"
  | "COMPLETADO"
  | "AUSENTE"
  | "CANCELADO_EN_TIEMPO"
  | "CANCELADO_TARDE"
  | "CANCELADO_POR_PROFESIONAL";

/** TurnoResponse: `profesionalId` es null en gimnasio; `canceladoEn`/`motivoCancelacion` solo si se canceló. */
export interface Turno {
  id: number;
  personaId: number;
  /** "Apellido, Nombre". */
  persona: string;
  personaNombre: string;
  personaApellido: string;
  /** Solo en el listado del ADMIN (`GET /api/turnos`). */
  personaDni?: string;
  tipoTurno: TipoTurno;
  profesionalId: number | null;
  inicio: string;
  fin: string;
  estado: EstadoTurno;
  /** Instante del ingreso (check-in); `null` mientras no se completó y en turnos previos a V16. */
  completadoEn: string | null;
  canceladoEn: string | null;
  motivoCancelacion: string | null;
  /** El turno lo reservó Recepción en nombre del socio (RN-27). */
  reservadoPorRecepcion: boolean;
  /** Lo canceló Recepción en nombre del socio. */
  canceladoPorRecepcion: boolean;
}

/** TurnoAgendaResponse (mi-agenda): vista plana y la única que trae el DNI del paciente. */
export interface TurnoAgenda {
  id: number;
  personaId: number;
  persona: string;
  pacienteDni: string;
  inicio: string;
  fin: string;
  estado: EstadoTurno;
}

/** FranjaGymResponse: una franja de 60 min de la grilla del gimnasio. */
export interface FranjaGym {
  inicio: string;
  fin: string;
  cupo: number;
  ocupados: number;
  disponibles: number;
}

/** SlotConsultorioResponse: `libre=false` si está tomado o ya pasó. */
export interface SlotConsultorio {
  inicio: string;
  fin: string;
  libre: boolean;
}

/**
 * ProximaAgendaResponse (RF-41): el primer día con turnos libres de un profesional en los próximos
 * 21 días. Sin agenda, `fecha` es `null` y `libres` 0.
 */
export interface ProximaAgenda {
  profesionalId: number;
  nombre: string;
  apellido: string;
  especialidad: Especialidad;
  duracionTurnoMinutos: number;
  /** `YYYY-MM-DD`; `null` si no tiene agenda en el horizonte. */
  fecha: string | null;
  libres: number;
}

/** EstadoGymResponse: mismo veredicto de morosidad que usa la reserva (RN-01, RN-09). */
export interface EstadoGym {
  esSocioGym: boolean;
  suspendido: boolean;
  periodosImpagos: number;
  umbral: number;
  excepcionVigente: boolean;
}

export interface Feriado {
  /** `YYYY-MM-DD`. */
  fecha: string;
  descripcion: string;
  tipo: string;
  cierraGimnasio: boolean;
  origen: string;
}
