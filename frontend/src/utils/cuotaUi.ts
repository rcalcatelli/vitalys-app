import type { ChipTone } from "../components/atoms/Chip";
import type { EstadoCuenta } from "../types/pago";
import { etiquetaPeriodoEnFrase, fechaDMA } from "./pagoUi";

export interface ResumenCuota {
  tone: ChipTone;
  label: string;
  linea: string;
}

/** `2026-10-15` → `15/10`. */
function diaMes(fecha: string): string {
  return `${fecha.slice(8, 10)}/${fecha.slice(5, 7)}`;
}

/**
 * Chip y línea de la tarjeta "Cuota del gimnasio" de Inicio (voseo). Misma regla de morosidad que
 * el estado de cuenta; los números salen del backend, no de constantes del diseño.
 */
export function resumenCuota(estado: EstadoCuenta): ResumenCuota {
  const { esSocioGym, suspendido, periodosImpagos: n, umbral, excepcion, periodos } = estado;
  if (!esSocioGym) {
    return {
      tone: "neutral",
      label: "Sin cuota de gym",
      linea: "Solo usás consultorios; se abonan por sesión.",
    };
  }
  if (suspendido || excepcion) {
    return {
      tone: excepcion ? "warn" : "bad",
      label: excepcion ? `Excepción hasta ${diaMes(excepcion.validaHasta)}` : "Suspendido",
      linea: `${n} períodos impagos. ${
        excepcion
          ? `Excepción vigente hasta ${fechaDMA(excepcion.validaHasta)}.`
          : "La reserva de gimnasio está suspendida."
      }`,
    };
  }
  if (n > 0) {
    return {
      tone: "warn",
      label: `${n} de ${umbral} impagos`,
      linea: `Tenés ${n} ${n === 1 ? "período impago" : "períodos impagos"}. Con ${umbral} se suspende la reserva de gimnasio.`,
    };
  }
  const pendiente = periodos.find((p) => p.estado === "PENDIENTE");
  return {
    tone: "ok",
    label: "Al día",
    linea: pendiente
      ? `La cuota de ${etiquetaPeriodoEnFrase(pendiente.periodo)} vence el ${fechaDMA(pendiente.vence)} (tolerancia hasta el ${fechaDMA(pendiente.limite)}).`
      : "No tenés períodos pendientes.",
  };
}
