package com.vitalys.domain;

/** Espeja el ENUM nativo de PostgreSQL {@code tipo_notificacion} (V1, V7). */
public enum TipoNotificacion {
    CONFIRMACION_TURNO,
    AVISO_CANCELACION,
    RECORDATORIO,
    AVISO_DEUDA,
    AVISO_SUSPENSION
}
