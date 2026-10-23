import { describe, expect, it } from "vitest";
import type { EstadoCuenta } from "../types/pago";
import { resumenCuota } from "./cuotaUi";

function estado(o: Partial<EstadoCuenta> = {}): EstadoCuenta {
  return {
    personaId: 1,
    nombreCompleto: "María Pérez",
    esSocioGym: true,
    fechaInicioMembresia: "2026-03-01",
    periodosImpagos: 0,
    umbral: 6,
    suspendido: false,
    excepcion: null,
    periodos: [
      {
        periodo: "2026-09-01",
        vence: "2026-10-01",
        limite: "2026-10-11",
        estado: "PENDIENTE",
        pago: null,
      },
    ],
    sesiones: [],
    totales: { cantidadPagos: 0, montoTotal: 0 },
    ...o,
  };
}

describe("resumenCuota", () => {
  it("al día con el vencimiento y la tolerancia del backend", () => {
    expect(resumenCuota(estado())).toEqual({
      tone: "ok",
      label: "Al día",
      linea: "La cuota de septiembre 2026 vence el 01/10/2026 (tolerancia hasta el 11/10/2026).",
    });
  });

  it("al día sin períodos pendientes", () => {
    expect(resumenCuota(estado({ periodos: [] })).linea).toBe("No tenés períodos pendientes.");
  });

  it("sin gimnasio", () => {
    expect(resumenCuota(estado({ esSocioGym: false }))).toMatchObject({
      tone: "neutral",
      label: "Sin cuota de gym",
    });
  });

  it("con impagos usa el umbral real y el singular", () => {
    expect(resumenCuota(estado({ periodosImpagos: 1, umbral: 3 }))).toMatchObject({
      tone: "warn",
      label: "1 de 3 impagos",
      linea: "Tenés 1 período impago. Con 3 se suspende la reserva de gimnasio.",
    });
    expect(resumenCuota(estado({ periodosImpagos: 2 })).linea).toContain("2 períodos impagos");
  });

  it("suspendido sin excepción", () => {
    expect(resumenCuota(estado({ periodosImpagos: 7, suspendido: true }))).toMatchObject({
      tone: "bad",
      label: "Suspendido",
      linea: "7 períodos impagos. La reserva de gimnasio está suspendida.",
    });
  });

  it("suspendido con excepción vigente", () => {
    const r = resumenCuota(
      estado({
        periodosImpagos: 6,
        suspendido: true,
        excepcion: {
          validaHasta: "2026-10-15",
          motivo: "x",
          autorizadaPor: null,
          otorgadaEl: null,
        },
      }),
    );
    expect(r).toMatchObject({ tone: "warn", label: "Excepción hasta 15/10" });
    expect(r.linea).toBe("6 períodos impagos. Excepción vigente hasta 15/10/2026.");
  });
});
