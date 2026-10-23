import { http } from "./http";
import type { ResumenHoy } from "../types/resumen";

/** GET /api/admin/resumen-hoy (ADMIN): panel "Hoy en el centro". */
export function obtenerResumenHoy(): Promise<ResumenHoy> {
  return http.get<ResumenHoy>("/api/admin/resumen-hoy");
}
