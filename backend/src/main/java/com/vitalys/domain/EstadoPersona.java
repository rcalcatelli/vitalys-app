package com.vitalys.domain;

/**
 * Espeja el ENUM nativo de PostgreSQL {@code estado_persona}. Se mapea con el mismo patrón que
 * {@link RolUsuario}: {@code @Enumerated(STRING)} + {@code @JdbcTypeCode(NAMED_ENUM)}.
 */
public enum EstadoPersona {
    ACTIVO,
    INACTIVO
}
