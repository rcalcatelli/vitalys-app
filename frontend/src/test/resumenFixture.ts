import type { ResumenHoy } from "../types/resumen";

export function unResumen(overrides: Partial<ResumenHoy> = {}): ResumenHoy {
  return {
    fecha: "2026-10-26",
    enGimnasioAhora: 3,
    turnosGymHoy: 14,
    consultasHoy: 5,
    conDeuda: 2,
    suspendidos: 1,
    franjasGym: [
      {
        inicio: "2026-10-26T09:00:00-03:00",
        fin: "2026-10-26T10:00:00-03:00",
        cupo: 20,
        ocupados: 6,
        disponibles: 14,
      },
      {
        inicio: "2026-10-26T10:00:00-03:00",
        fin: "2026-10-26T11:00:00-03:00",
        cupo: 20,
        ocupados: 8,
        disponibles: 12,
      },
      {
        inicio: "2026-10-26T11:00:00-03:00",
        fin: "2026-10-26T12:00:00-03:00",
        cupo: 20,
        ocupados: 0,
        disponibles: 20,
      },
    ],
    requierenAtencion: [
      {
        personaId: 2,
        persona: "García, Juan",
        nombrePila: "Juan",
        apellido: "García",
        dni: "38100002",
        periodosImpagos: 6,
        umbral: 6,
        suspendido: false,
        excepcionHasta: "2026-11-20",
      },
      {
        personaId: 7,
        persona: "Ruiz, Pablo",
        nombrePila: "Pablo",
        apellido: "Ruiz",
        dni: "38100007",
        periodosImpagos: 7,
        umbral: 6,
        suspendido: true,
        excepcionHasta: null,
      },
      {
        personaId: 5,
        persona: "Fernández, Ana",
        nombrePila: "Ana",
        apellido: "Fernández",
        dni: "38100005",
        periodosImpagos: 2,
        umbral: 6,
        suspendido: false,
        excepcionHasta: null,
      },
    ],
    ...overrides,
  };
}
