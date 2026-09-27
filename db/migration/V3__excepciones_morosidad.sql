-- =============================================================================
-- Vitalys App — V3: tabla `excepciones_morosidad`
--
-- Devolución de la 2.ª entrega (punto 1): la tabla de excepciones de
-- morosidad figuraba en el diccionario de datos, el DER y RN-09/RF-30, pero
-- nunca se había creado en el DDL. El INSERT de seed.sql para esta tabla
-- estaba comentado esperando este script.
--
-- Fuente de verdad para la estructura (las cuatro coinciden entre sí, sin
-- contradicciones a resolver):
--   · docs/02-diseno/diccionario-datos.md  → tabla `excepciones_morosidad`
--   · docs/02-diseno/diagrama-er.mermaid   → entidad `excepciones_morosidad`
--   · docs/02-diseno/requerimientos.md     → RN-09 (regla) y RF-30 (permiso)
--   · db/dml/seed.sql                      → INSERT comentado (mismas columnas)
--
-- RN-09: el ADMIN autoriza una excepción puntual a RN-01 (morosidad) para un
-- socio. RNF-08 (trazabilidad): toda operación crítica registra quién la
-- ejecutó y cuándo → `autorizado_por` (quién) + `creado_en` (cuándo).
-- =============================================================================

CREATE TABLE excepciones_morosidad (
    id              BIGSERIAL       PRIMARY KEY,
    persona_id      BIGINT          NOT NULL REFERENCES personas(id),
    autorizado_por  BIGINT          NOT NULL REFERENCES usuarios(id),
    turno_id        BIGINT          REFERENCES turnos(id),
    motivo          TEXT            NOT NULL,
    valida_hasta    DATE            NOT NULL,
    creado_en       TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  excepciones_morosidad                 IS 'RN-09/RF-30: excepciones puntuales a la regla de morosidad (RN-01), autorizadas por un ADMIN. La validación de RN-01 y la consulta de excepción vigente ocurren en la capa de servicio Java, no en el motor.';
COMMENT ON COLUMN excepciones_morosidad.persona_id      IS 'Socio moroso beneficiado por la excepción.';
COMMENT ON COLUMN excepciones_morosidad.autorizado_por  IS 'Usuario que autorizó la excepción. Debe tener rol ADMIN (no se fuerza con CHECK, igual que registrado_por_usuario en pagos y reservado_por_usuario_id en turnos); RNF-08.';
COMMENT ON COLUMN excepciones_morosidad.turno_id        IS 'Turno puntual habilitado por la excepción. NULL si la excepción es por período (cualquier turno de gym hasta valida_hasta).';
COMMENT ON COLUMN excepciones_morosidad.motivo          IS 'Justificación registrada por el ADMIN al autorizar.';
COMMENT ON COLUMN excepciones_morosidad.valida_hasta    IS 'Fecha de vencimiento de la excepción; a partir de este día vuelve a regir RN-01 sin excepción.';

-- Consulta típica: "¿esta persona tiene una excepción vigente hoy?"
CREATE INDEX idx_excepciones_morosidad_persona ON excepciones_morosidad (persona_id, valida_hasta);
