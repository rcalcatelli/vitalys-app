package com.vitalys.domain;

/**
 * Espeja el ENUM nativo {@code estado_turno} (V1 + {@code CANCELADO_POR_PROFESIONAL} de V12).
 * Si el lugar queda ocupado o no lo decide {@code fn_turno_ocupa_lugar}, no el estado.
 */
public enum EstadoTurno {
    RESERVADO,
    COMPLETADO,
    AUSENTE,
    CANCELADO_EN_TIEMPO,
    CANCELADO_TARDE,
    CANCELADO_POR_PROFESIONAL
}
