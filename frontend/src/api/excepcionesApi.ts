import { http } from "./http";
import type { Excepcion, NuevaExcepcion } from "../types/pago";

/**
 * POST /api/excepciones-morosidad (ADMIN, RN-09): habilita reservar gimnasio hasta `validaHasta`.
 * El servidor responde 422 si la persona no está suspendida y 403 durante "Operar como".
 */
export function autorizarExcepcion(excepcion: NuevaExcepcion): Promise<Excepcion> {
  return http.post<Excepcion>("/api/excepciones-morosidad", excepcion);
}
