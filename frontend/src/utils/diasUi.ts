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
