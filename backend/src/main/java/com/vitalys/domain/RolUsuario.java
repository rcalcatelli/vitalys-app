package com.vitalys.domain;

/**
 * Espeja el ENUM nativo de PostgreSQL {@code rol_usuario} (ver {@code db/ddl/vitalys_ddl.sql}).
 *
 * <p>Patrón de mapeo reutilizable para los 7 ENUM nativos del esquema (design.md §2): el campo
 * de la entidad debe declararse con la combinación exacta
 *
 * <pre>{@code
 * @Enumerated(EnumType.STRING)
 * @JdbcTypeCode(SqlTypes.NAMED_ENUM)
 * @Column(name = "...", columnDefinition = "<nombre_del_tipo_postgres>", nullable = false)
 * private AlgunEnum campo;
 * }</pre>
 *
 * <p>{@code @Enumerated(EnumType.STRING)} solo, sin {@code @JdbcTypeCode(SqlTypes.NAMED_ENUM)},
 * hace que Hibernate envíe el valor como {@code varchar}, y PostgreSQL rechaza el bind contra un
 * ENUM nativo. {@code NAMED_ENUM} le indica a Hibernate que use el tipo ENUM nombrado de Postgres
 * en el bind, resolviendo el cast implícito. Este mismo patrón se reutiliza en Sprints 3-5 para
 * {@code estado_persona}, {@code especialidad}, {@code tipo_turno}, {@code estado_turno},
 * {@code concepto_pago} y {@code tipo_notificacion}.
 */
public enum RolUsuario {
    SOCIO_PACIENTE,
    PROFESIONAL,
    ADMIN
}
