import { http } from "./http";
import type { NotificacionFallida } from "../types/notificacion";

/** GET /api/admin/notificaciones?fallidas=true (ADMIN): avisos de cancelación que no llegaron al paciente. */
export function listarFallidas(): Promise<NotificacionFallida[]> {
  return http.get<NotificacionFallida[]>("/api/admin/notificaciones?fallidas=true");
}
