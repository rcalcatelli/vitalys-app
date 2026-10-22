// Contrato real del Módulo 5 (pagos). Espeja los DTOs del backend (EstadoCuentaResponse,
// RegistrarPagoRequest, PagoResponse). Las fechas calendario llegan como `YYYY-MM-DD` y los
// instantes como ISO-8601 con offset de Buenos Aires. Los montos son números (ARS).
export type MedioPago = "EFECTIVO" | "TRANSFERENCIA" | "DEBITO" | "CREDITO";

export type ConceptoPago = "CUOTA_MENSUAL" | "SESION_CONSULTORIO";

export type EstadoPeriodo = "PAGADO" | "IMPAGO" | "PENDIENTE";

export interface PagoDto {
  id: number;
  monto: number;
  medio: MedioPago;
  fechaPago: string;
}

/** Un período mensual de la cuota: `periodo` es el día 1; `limite` es el último día de gracia. */
export interface PeriodoDto {
  periodo: string;
  vence: string;
  limite: string;
  estado: EstadoPeriodo;
  pago: PagoDto | null;
}

export interface SesionDto {
  pagoId: number;
  turnoId: number;
  fechaTurno: string;
  monto: number;
  medio: MedioPago;
  fechaPago: string;
}

/** Excepción de morosidad vigente (si viene, está vigente). */
export interface ExcepcionInfo {
  validaHasta: string;
  motivo: string;
}

export interface EstadoCuenta {
  personaId: number;
  nombreCompleto: string;
  esSocioGym: boolean;
  fechaInicioMembresia: string | null;
  periodosImpagos: number;
  umbral: number;
  suspendido: boolean;
  excepcion: ExcepcionInfo | null;
  periodos: PeriodoDto[];
  sesiones: SesionDto[];
  totales: { cantidadPagos: number; montoTotal: number };
}

/** POST /api/pagos: cuota lleva `periodo` (día 1) y sesión lleva `turnoId`. */
export interface RegistrarPago {
  personaId: number;
  concepto: ConceptoPago;
  monto: number;
  medio: MedioPago;
  periodo?: string;
  turnoId?: number;
}

export interface PagoRegistrado {
  id: number;
  personaId: number;
  concepto: ConceptoPago;
  monto: number;
  medio: MedioPago;
  periodo: string | null;
  turnoId: number | null;
  fechaPago: string;
}
