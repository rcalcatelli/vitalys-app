import type { NotificacionFallida } from "../types/notificacion";

export function unaNotificacion(extra: Partial<NotificacionFallida> = {}): NotificacionFallida {
  return {
    id: 1,
    tipo: "DEFINITIVA",
    tipoNotificacion: "AVISO_CANCELACION",
    personaId: 10,
    pacienteNombre: "Juan García",
    pacienteEmail: "juan@mail.com",
    turnoId: 100,
    profesionalId: 2,
    profesionalNombre: "Lic. Valentina Méndez",
    fecha: "2026-10-21",
    hora: "10:30:00",
    detalleError: "Buzón lleno",
    intentos: 2,
    ultimoIntentoEn: "2026-10-20T14:32:00-03:00",
    enviadoEn: null,
    ...extra,
  };
}
