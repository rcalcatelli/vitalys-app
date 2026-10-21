package com.vitalys.domain;

/**
 * Espeja el ENUM nativo de PostgreSQL {@code especialidad}. Se mapea con el mismo patrón que
 * {@link RolUsuario}: {@code @Enumerated(STRING)} + {@code @JdbcTypeCode(NAMED_ENUM)}.
 */
public enum Especialidad {
    NUTRICION,
    PSICOLOGIA,
    KINESIOLOGIA
}
