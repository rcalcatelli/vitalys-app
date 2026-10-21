import { ApiError, http } from "./http";
import type { FranjaApi, FranjaInput } from "../types/disponibilidad";
import type { Impacto, Profesional, ProfesionalAlta, ProfesionalDatos } from "../types/profesional";

/** GET /api/profesionales. El ADMIN ve activos e inactivos y el email (RF-12). */
export function listarProfesionales(): Promise<Profesional[]> {
  return http.get<Profesional[]>("/api/profesionales");
}

/** GET /api/profesionales/me: 404 si el usuario no tiene un profesional asociado. */
export function miPerfilProfesional(): Promise<Profesional> {
  return http.get<Profesional>("/api/profesionales/me");
}

export function obtenerProfesional(id: number): Promise<Profesional> {
  return http.get<Profesional>(`/api/profesionales/${id}`);
}

export function crearProfesional(alta: ProfesionalAlta): Promise<Profesional> {
  return http.post<Profesional>("/api/profesionales", alta);
}

export function actualizarProfesional(id: number, datos: ProfesionalDatos): Promise<Profesional> {
  return http.put<Profesional>(`/api/profesionales/${id}`, datos);
}

/** Paso 1 de la baja (RN-25): turnos futuros que se cancelarían. No modifica nada. */
export function impactoDeBaja(id: number): Promise<Impacto> {
  return http.get<Impacto>(`/api/profesionales/${id}/baja/impacto`);
}

/** Paso 2 de la baja: con turnos afectados el backend exige `confirmar=true` (409 con el impacto si falta). */
export function darDeBajaProfesional(id: number, confirmar: boolean): Promise<Profesional> {
  return http.delete<Profesional>(`/api/profesionales/${id}?confirmar=${confirmar}`);
}

/** Reactivación: habilita de nuevo al profesional y su usuario. Vuelve sin franjas (la baja las borró, RN-25). */
export function reactivar(id: number): Promise<Profesional> {
  return http.patch<Profesional>(`/api/profesionales/${id}/reactivar`);
}

export function listarFranjas(id: number): Promise<FranjaApi[]> {
  return http.get<FranjaApi[]>(`/api/profesionales/${id}/disponibilidad`);
}

/** Vista previa (solo lectura) de los turnos que quedarían sin cobertura con el conjunto propuesto (RN-24). */
export function impactoDeDisponibilidad(id: number, franjas: FranjaInput[]): Promise<Impacto> {
  return http.post<Impacto>(`/api/profesionales/${id}/disponibilidad/impacto`, { franjas });
}

/** Reemplazo total de la disponibilidad en una transacción. */
export function reemplazarDisponibilidad(
  id: number,
  franjas: FranjaInput[],
  confirmar: boolean,
): Promise<FranjaApi[]> {
  return http.put<FranjaApi[]>(`/api/profesionales/${id}/disponibilidad?confirmar=${confirmar}`, {
    franjas,
  });
}

/**
 * Si el error es el 409 de RN-24/RN-25 (el cambio cancelaría turnos y falta confirmar),
 * devuelve el impacto que trae el body; en cualquier otro caso, `null`.
 */
export function impactoDeError(err: unknown): Impacto | null {
  if (!(err instanceof ApiError) || err.status !== 409) return null;
  const body = err.body as { impacto?: Impacto } | undefined;
  return body?.impacto ?? null;
}
