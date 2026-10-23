import { http } from "./http";
import type { OperarComoResponse } from "../types/auth";

/** POST /api/admin/operar-como: el ADMIN pide una credencial para operar en nombre de un socio. */
export function iniciarOperarComo(personaId: number): Promise<OperarComoResponse> {
  return http.post<OperarComoResponse>("/api/admin/operar-como", { personaId });
}

/**
 * POST /api/operar-como/fin: termina la sesión (se audita y el servidor deja de aceptar la
 * credencial). Se llama con la credencial de "Operar como".
 */
export function terminarOperarComo(): Promise<void> {
  return http.post<void>("/api/operar-como/fin");
}
