import { fechaLarga } from "./formato";
import { diaSemana, instanteBA } from "./fechaBA";

const ABREVIATURA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

/** `2026-10-26` → `Lun`. */
export function abreviaturaDia(fecha: string): string {
  return ABREVIATURA[diaSemana(fecha) - 1];
}

/** `2026-10-26` → `26`. */
export function numeroDia(fecha: string): number {
  return Number(fecha.slice(8, 10));
}

/** `2026-10-26` → `26/10`. */
export function fechaCorta(fecha: string): string {
  return `${fecha.slice(8, 10)}/${fecha.slice(5, 7)}`;
}

/** `2026-10-26` → `Lunes 26 de octubre`. */
export function fechaLargaDe(fecha: string): string {
  return fechaLarga(instanteBA(fecha, "12:00"));
}

const MESES_CORTOS = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];
const MESES_LARGOS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];
const DIAS_LARGOS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

/** `2026-09-30` → `Mié 30 sep` (fecha corta de las tablas del socio). */
export function fechaDiaMes(fecha: string): string {
  return `${abreviaturaDia(fecha)} ${numeroDia(fecha)} ${MESES_CORTOS[Number(fecha.slice(5, 7)) - 1]}`;
}

/** `2026-09-30` → `Miércoles`. */
export function nombreDia(fecha: string): string {
  return DIAS_LARGOS[diaSemana(fecha) - 1];
}

/** `2026-09-30` → `septiembre`. */
export function nombreMes(fecha: string): string {
  return MESES_LARGOS[Number(fecha.slice(5, 7)) - 1];
}

/** Días de calendario entre `desde` y `hasta` (negativo si `hasta` es anterior). */
export function diasEntre(desde: string, hasta: string): number {
  const aMs = (f: string) =>
    Date.UTC(Number(f.slice(0, 4)), Number(f.slice(5, 7)) - 1, Number(f.slice(8, 10)));
  return Math.round((aMs(hasta) - aMs(desde)) / 86_400_000);
}

/** `hoy`, `mañana`, `ayer`, `en 3 días`, `hace 2 días`: la fecha relativa a `hoy`. */
export function fechaRelativa(fecha: string, hoy: string): string {
  const d = diasEntre(hoy, fecha);
  if (d === 0) return "hoy";
  if (d === 1) return "mañana";
  if (d === -1) return "ayer";
  return d > 0 ? `en ${d} días` : `hace ${-d} días`;
}
