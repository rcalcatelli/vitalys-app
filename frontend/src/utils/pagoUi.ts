import type { ChipTone } from "../components/atoms/Chip";
import type { EstadoPeriodo, MedioPago } from "../types/pago";
import { fechaBA } from "./fechaBA";

const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

export const MEDIOS: MedioPago[] = ["EFECTIVO", "TRANSFERENCIA", "DEBITO", "CREDITO"];

const ETIQUETA_MEDIO: Record<MedioPago, string> = {
  EFECTIVO: "Efectivo",
  TRANSFERENCIA: "Transferencia",
  DEBITO: "Débito",
  CREDITO: "Crédito",
};

const ETIQUETA_ESTADO: Record<EstadoPeriodo, string> = {
  PAGADO: "Pagado",
  IMPAGO: "Impago",
  PENDIENTE: "Pendiente",
};

export function etiquetaMedio(medio: MedioPago): string {
  return ETIQUETA_MEDIO[medio];
}

export function etiquetaEstadoPeriodo(estado: EstadoPeriodo): string {
  return ETIQUETA_ESTADO[estado];
}

/** Tono del chip de un período: pagado en verde, impago en rojo, pendiente (en gracia) en ámbar. */
export function tonoEstadoPeriodo(estado: EstadoPeriodo): ChipTone {
  if (estado === "PAGADO") return "ok";
  if (estado === "IMPAGO") return "bad";
  return "warn";
}

/** `2026-10-01` → `Octubre 2026`. */
export function etiquetaPeriodo(periodo: string): string {
  return `${MESES[Number(periodo.slice(5, 7)) - 1]} ${periodo.slice(0, 4)}`;
}

/** `2026-10-01` → `octubre 2026` (para frases: "La cuota de octubre 2026 vence…"). */
export function etiquetaPeriodoEnFrase(periodo: string): string {
  return etiquetaPeriodo(periodo).toLowerCase();
}

/** `2026-10-15` → `15/10/2026`. */
export function fechaDMA(fecha: string): string {
  return `${fecha.slice(8, 10)}/${fecha.slice(5, 7)}/${fecha.slice(0, 4)}`;
}

/** Instante ISO → `15/10/2026` en hora de Buenos Aires. */
export function fechaInstanteDMA(instante: string): string {
  return fechaDMA(fechaBA(instante));
}

const formatoEntero = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });
const formatoDecimal = new Intl.NumberFormat("es-AR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** `35000` → `$ 35.000`; con centavos, `$ 8.000,50` (ARS, como el mockup). */
export function formatearMonto(monto: number): string {
  const formato = Number.isInteger(monto) ? formatoEntero : formatoDecimal;
  return `$ ${formato.format(monto)}`;
}

/** Suma `n` meses a un período `YYYY-MM-01` (cruza años). */
export function sumarMeses(periodo: string, n: number): string {
  const total = Number(periodo.slice(0, 4)) * 12 + (Number(periodo.slice(5, 7)) - 1) + n;
  const anio = Math.floor(total / 12);
  const mes = (total % 12) + 1;
  return `${anio}-${String(mes).padStart(2, "0")}-01`;
}

/**
 * Convierte el texto del monto a número: acepta coma o punto decimal. Devuelve `null` si no es un
 * número válido; el "mayor que cero" lo valida quien lo usa.
 */
export function parsearMonto(texto: string): number | null {
  const limpio = texto.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(limpio)) return null;
  return Number(limpio);
}
