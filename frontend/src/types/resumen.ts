// Contrato de GET /api/admin/resumen-hoy (ResumenHoyResponse).
export interface FranjaGym {
  inicio: string;
  fin: string;
  cupo: number;
  ocupados: number;
  disponibles: number;
}

export interface SocioConDeuda {
  personaId: number;
  /** "Apellido, Nombre". */
  persona: string;
  nombrePila: string;
  apellido: string;
  dni: string;
  periodosImpagos: number;
  umbral: number;
  /** true si no puede reservar gimnasio: alcanzó el umbral y no tiene excepción vigente. */
  suspendido: boolean;
  /** `yyyy-MM-dd`, o null si no tiene excepción vigente. */
  excepcionHasta: string | null;
}

export interface ResumenHoy {
  fecha: string;
  enGimnasioAhora: number;
  turnosGymHoy: number;
  consultasHoy: number;
  conDeuda: number;
  suspendidos: number;
  franjasGym: FranjaGym[];
  requierenAtencion: SocioConDeuda[];
}
