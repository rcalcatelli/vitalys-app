import { http } from "./http";
import { normalizarPersona, normalizarPersonas } from "./normalizar";
import type {
  FiltroPersonas,
  Persona,
  PersonaAlta,
  PersonaDatos,
  PersonaVinculo,
} from "../types/persona";

/**
 * Traduce el filtro de Personas a los query params de GET /api/personas (RF-06, RF-43). "Con deuda"
 * se resuelve en el servidor; "Consultorio" no tiene parámetro: lo filtra la pantalla.
 */
export function construirQuery(filtro: FiltroPersonas, texto: string): string {
  const params = new URLSearchParams();
  if (filtro === "GYM") params.set("soloGym", "true");
  if (filtro === "CON_DEUDA") params.set("conDeuda", "true");
  const q = texto.trim();
  if (q) params.set("q", q);
  const query = params.toString();
  return query ? `?${query}` : "";
}

export function listarPersonas(filtro: FiltroPersonas, texto: string): Promise<Persona[]> {
  return http
    .get<Persona[]>(`/api/personas${construirQuery(filtro, texto)}`)
    .then(normalizarPersonas);
}

export function crearPersona(alta: PersonaAlta): Promise<Persona> {
  return http.post<Persona>("/api/personas", alta).then(normalizarPersona);
}

export function vincularPersona(vinculo: PersonaVinculo): Promise<Persona> {
  return http.post<Persona>("/api/personas/vincular", vinculo).then(normalizarPersona);
}

export function actualizarPersona(id: number, datos: PersonaDatos): Promise<Persona> {
  return http.put<Persona>(`/api/personas/${id}`, datos).then(normalizarPersona);
}

export function darDeBajaPersona(id: number): Promise<Persona> {
  return http.patch<Persona>(`/api/personas/${id}/baja`).then(normalizarPersona);
}

export function reactivarPersona(id: number): Promise<Persona> {
  return http.patch<Persona>(`/api/personas/${id}/reactivar`).then(normalizarPersona);
}
