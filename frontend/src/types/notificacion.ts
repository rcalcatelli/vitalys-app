// Contrato de GET /api/admin/notificaciones?fallidas=true (NotificacionFallidaResponse).
/** DEFINITIVA: falló dos veces. HUERFANA: quedó en curso por un reinicio y nunca se resolvió. */
export type TipoFalla = "DEFINITIVA" | "HUERFANA";

export interface NotificacionFallida {
  id: number;
  tipo: TipoFalla;
  tipoNotificacion: string;
  personaId: number;
  pacienteNombre: string;
  pacienteEmail: string;
  /** Los datos del turno son `null` si la notificación no está asociada a uno. */
  turnoId: number | null;
  profesionalId: number | null;
  profesionalNombre: string | null;
  /** `yyyy-MM-dd` */
  fecha: string | null;
  /** `HH:mm:ss` */
  hora: string | null;
  detalleError: string | null;
  intentos: number;
  ultimoIntentoEn: string | null;
  enviadoEn: string | null;
}
