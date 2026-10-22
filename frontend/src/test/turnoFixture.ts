import type { EstadoGym, FranjaGym, Turno, TurnoAgenda } from "../types/turno";

export function unTurno(overrides: Partial<Turno> = {}): Turno {
  return {
    id: 1,
    personaId: 3,
    persona: "Juan García",
    tipoTurno: "CONSULTORIO",
    profesionalId: 1,
    inicio: "2026-10-28T10:00:00-03:00",
    fin: "2026-10-28T10:30:00-03:00",
    estado: "RESERVADO",
    canceladoEn: null,
    motivoCancelacion: null,
    ...overrides,
  };
}

export function unTurnoGym(overrides: Partial<Turno> = {}): Turno {
  return unTurno({
    tipoTurno: "GYM",
    profesionalId: null,
    inicio: "2026-10-27T18:00:00-03:00",
    fin: "2026-10-27T19:00:00-03:00",
    ...overrides,
  });
}

export function unTurnoAgenda(overrides: Partial<TurnoAgenda> = {}): TurnoAgenda {
  return {
    id: 1,
    personaId: 3,
    persona: "Juan García",
    pacienteDni: "30111222",
    inicio: "2026-10-26T11:00:00-03:00",
    fin: "2026-10-26T11:30:00-03:00",
    estado: "RESERVADO",
    ...overrides,
  };
}

export function unEstadoGym(overrides: Partial<EstadoGym> = {}): EstadoGym {
  return {
    esSocioGym: true,
    suspendido: false,
    periodosImpagos: 0,
    umbral: 3,
    excepcionVigente: false,
    ...overrides,
  };
}

/** Franja de 60 min de gimnasio del día `fecha` a la `hora` (hora de Buenos Aires). */
export function unaFranjaGym(fecha: string, hora: number, ocupados = 0, cupo = 20): FranjaGym {
  const h = String(hora).padStart(2, "0");
  const f = String(hora + 1).padStart(2, "0");
  return {
    inicio: `${fecha}T${h}:00:00-03:00`,
    fin: `${fecha}T${f}:00:00-03:00`,
    cupo,
    ocupados,
    disponibles: cupo - ocupados,
  };
}
