import { http } from "./http";
import type { FiltroPersonas, Persona, PersonaAlta, PersonaDatos } from "../types/persona";

/** Traduce el filtro de W-05 a los query params de GET /api/personas (RF-06). */
export function construirQuery(filtro: FiltroPersonas, texto: string): string {
  const params = new URLSearchParams();
  if (filtro === "ACTIVOS") params.set("estado", "ACTIVO");
  if (filtro === "INACTIVOS") params.set("estado", "INACTIVO");
  if (filtro === "GYM") params.set("soloGym", "true");
  const q = texto.trim();
  if (q) params.set("q", q);
  const query = params.toString();
  return query ? `?${query}` : "";
}

export function listarPersonas(filtro: FiltroPersonas, texto: string): Promise<Persona[]> {
  return http.get<Persona[]>(`/api/personas${construirQuery(filtro, texto)}`);
}

export function crearPersona(alta: PersonaAlta): Promise<Persona> {
  return http.post<Persona>("/api/personas", alta);
}

export function actualizarPersona(id: number, datos: PersonaDatos): Promise<Persona> {
  return http.put<Persona>(`/api/personas/${id}`, datos);
}

export function darDeBajaPersona(id: number): Promise<Persona> {
  return http.patch<Persona>(`/api/personas/${id}/baja`);
}

export function reactivarPersona(id: number): Promise<Persona> {
  return http.patch<Persona>(`/api/personas/${id}/reactivar`);
}
