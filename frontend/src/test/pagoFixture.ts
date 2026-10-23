import type { EstadoCuenta, PeriodoDto, SesionDto } from "../types/pago";

export function unPeriodo(overrides: Partial<PeriodoDto> = {}): PeriodoDto {
  return {
    periodo: "2026-10-01",
    vence: "2026-11-01",
    limite: "2026-11-11",
    estado: "PAGADO",
    pago: { id: 1, monto: 15000, medio: "EFECTIVO", fechaPago: "2026-10-03T12:00:00-03:00" },
    ...overrides,
  };
}

export function unaSesion(overrides: Partial<SesionDto> = {}): SesionDto {
  return {
    pagoId: 9,
    turnoId: 50,
    fechaTurno: "2026-10-20T10:00:00-03:00",
    profesional: "Valentina Méndez",
    especialidad: "NUTRICION",
    monto: 8000,
    medio: "TRANSFERENCIA",
    fechaPago: "2026-10-20T11:00:00-03:00",
    ...overrides,
  };
}

/** Socio de gimnasio al día: septiembre y octubre pagados, sin sesiones. */
export function unEstadoCuenta(overrides: Partial<EstadoCuenta> = {}): EstadoCuenta {
  return {
    personaId: 3,
    nombreCompleto: "Juan García",
    esSocioGym: true,
    fechaInicioMembresia: "2026-09-01",
    periodosImpagos: 0,
    umbral: 3,
    suspendido: false,
    excepcion: null,
    periodos: [
      unPeriodo({ periodo: "2026-09-01", vence: "2026-10-01", limite: "2026-10-11" }),
      unPeriodo(),
    ],
    sesiones: [],
    totales: { cantidadPagos: 2, montoTotal: 30000 },
    ...overrides,
  };
}
