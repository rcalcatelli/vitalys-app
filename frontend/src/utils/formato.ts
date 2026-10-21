import type { Especialidad, Profesional } from "../types/profesional";

export const ESPECIALIDADES: Especialidad[] = ["NUTRICION", "PSICOLOGIA", "KINESIOLOGIA"];

const ETIQUETA_ESPECIALIDAD: Record<Especialidad, string> = {
  NUTRICION: "Nutrición",
  PSICOLOGIA: "Psicología",
  KINESIOLOGIA: "Kinesiología",
};

/** Duración sugerida por especialidad (mockup): el ADMIN puede ajustarla. */
export const DURACION_SUGERIDA: Record<Especialidad, number> = {
  NUTRICION: 30,
  PSICOLOGIA: 50,
  KINESIOLOGIA: 45,
};

export function etiquetaEspecialidad(especialidad: Especialidad): string {
  return ETIQUETA_ESPECIALIDAD[especialidad];
}

/** `Lic. Nombre Apellido`, como en el mockup. */
export function nombreProfesional(p: Pick<Profesional, "nombre" | "apellido">): string {
  return `Lic. ${p.nombre} ${p.apellido}`;
}

const ZONA = "America/Argentina/Buenos_Aires";

const formatoFecha = new Intl.DateTimeFormat("es-AR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: ZONA,
});

const formatoHora = new Intl.DateTimeFormat("es-AR", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: ZONA,
});

/** `2026-10-21T13:00:00-03:00` → `Miércoles 21 de octubre`. */
export function fechaLarga(iso: string): string {
  const texto = formatoFecha.format(new Date(iso)).replace(",", "");
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** `2026-10-21T13:00:00-03:00` → `13:00`. */
export function horaCorta(iso: string): string {
  return formatoHora.format(new Date(iso));
}
