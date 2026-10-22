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
  persona: string;
  tipoTurno: TipoTurno;
  profesionalId: number | null;
  inicio: string;
  fin: string;
  estado: EstadoTurno;
  canceladoEn: string | null;
  motivoCancelacion: string | null;
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
