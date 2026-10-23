-- =============================================================================
-- Vitalys App — V17: auditoría de "Operar como" (RF-39, RN-26, RN-27)
--
-- Cambio `ui-pixel-perfect`. Recepción (ADMIN) puede operar en nombre de un socio con
-- una credencial de vida corta. Todo lo que se escribe durante esa sesión queda
-- registrado acá, en la misma transacción que la escritura: si la fila no se puede
-- guardar, la operación no se confirma.
--
-- sesion_id es el `jti` del JWT de la sesión. El filtro de autenticación acepta una
-- credencial de "Operar como" solo si su sesión tiene fila INICIO y todavía no tiene
-- fila FIN: así terminar la sesión la revoca en el servidor, aunque el token no haya
-- vencido.
--
-- INICIO y FIN no afectan un turno; las demás acciones sí. Lo garantiza
-- chk_auditoria_turno_segun_accion.
-- =============================================================================

CREATE TYPE accion_operar_como AS ENUM ('INICIO', 'FIN', 'RESERVA_GYM', 'RESERVA_CONSULTORIO', 'CANCELACION');

CREATE TABLE auditoria_operar_como (
    id                   BIGSERIAL            PRIMARY KEY,
    sesion_id            UUID                 NOT NULL,
    operador_usuario_id  BIGINT               NOT NULL REFERENCES usuarios(id),
    sujeto_usuario_id    BIGINT               NOT NULL REFERENCES usuarios(id),
    persona_id           BIGINT               NOT NULL REFERENCES personas(id),
    accion               accion_operar_como   NOT NULL,
    turno_id             BIGINT               REFERENCES turnos(id),
    ocurrido_en          TIMESTAMPTZ          NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_auditoria_operador_distinto CHECK (operador_usuario_id <> sujeto_usuario_id),
    CONSTRAINT chk_auditoria_turno_segun_accion CHECK ((accion IN ('INICIO', 'FIN')) = (turno_id IS NULL))
);

CREATE INDEX idx_auditoria_operar_como_persona ON auditoria_operar_como (persona_id, ocurrido_en DESC);
CREATE INDEX idx_auditoria_operar_como_operador ON auditoria_operar_como (operador_usuario_id, ocurrido_en DESC);
CREATE INDEX idx_auditoria_operar_como_sesion ON auditoria_operar_como (sesion_id);

COMMENT ON TABLE auditoria_operar_como IS
    'Sesiones de "Operar como" (RN-26) y cada escritura hecha en ellas (RN-27). '
    'operador = ADMIN real; sujeto = socio en cuyo nombre se operó.';
COMMENT ON COLUMN auditoria_operar_como.sesion_id IS
    'jti del JWT de la sesión. Con fila FIN, la credencial deja de autenticar.';
