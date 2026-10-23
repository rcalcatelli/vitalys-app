import type { ChipTone } from "../components/atoms/Chip";
import type { Persona } from "../types/persona";
import { etiquetaEspecialidad } from "./formato";

export interface CuotaChip {
  tone: ChipTone;
  label: string;
}

/** `2026-10-15` → `15/10`, sin pasar por `Date` para no correr el día por zona horaria. */
export function diaMes(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
}

/**
 * Chip de cuota de una persona en Personas y Pagos. Sale de lo que informa el backend (RN-01, una
 * sola fuente de verdad): la excepción vigente manda sobre la suspensión y esta sobre los impagos.
 */
export function chipCuota(p: Pick<Persona, "estado" | "esSocioGym" | "cuota">): CuotaChip {
  if (p.estado === "INACTIVO") return { tone: "neutral", label: "Dado de baja" };
  const { cuota } = p;
  if (!p.esSocioGym || !cuota) return { tone: "neutral", label: "Sin cuota de gym" };
  if (cuota.excepcionHasta) {
    return { tone: "warn", label: `Excepción hasta ${diaMes(cuota.excepcionHasta)}` };
  }
  if (cuota.suspendido) return { tone: "bad", label: "Suspendido" };
  if (cuota.periodosImpagos > 0) {
    return { tone: "warn", label: `${cuota.periodosImpagos} de ${cuota.umbral} impagos` };
  }
  return { tone: "ok", label: "Al día" };
}

export interface Servicio {
  tone: "gym" | "clin";
  label: string;
}

/** Servicios de una persona: Gimnasio si es socia y una etiqueta por especialidad que usó. */
export function serviciosDe(p: Pick<Persona, "esSocioGym" | "especialidades">): Servicio[] {
  const servicios: Servicio[] = [];
  if (p.esSocioGym) servicios.push({ tone: "gym", label: "Gimnasio" });
  for (const e of p.especialidades)
    servicios.push({ tone: "clin", label: etiquetaEspecialidad(e) });
  return servicios;
}

/** Iniciales para el avatar: primera letra del nombre y del apellido. */
export function inicialesDe(p: Pick<Persona, "nombre" | "apellido">): string {
  return `${p.nombre.charAt(0)}${p.apellido.charAt(0)}`.toUpperCase();
}
