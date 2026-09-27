-- =============================================================================
-- Vitalys App — V5: ensanchar `excl_turnos_overlap`
--
-- Devolución de la 2.ª entrega (punto 8): la restricción de solapamiento
-- (V1) solo bloqueaba contra turnos RESERVADO y CANCELADO_TARDE. Un turno
-- AUSENTE o COMPLETADO ya pasó (el profesional atendió o el paciente no se
-- presentó) y RN-08 dice explícitamente que el slot sigue ocupado — pero la
-- restricción del motor no lo cubría, así que un segundo turno para el mismo
-- profesional en el mismo horario terminaba pasando el EXCLUDE igual.
--
-- Se ajusta la restricción (el WHERE de excl_turnos_overlap), no la regla
-- RN-08 ni el enum estado_turno: RN-08 ya decía "el slot se considera
-- ocupado", el motor no lo estaba haciendo cumplir.
--
-- CANCELADO_EN_TIEMPO sigue afuera a propósito: es el único estado que
-- libera el cupo (RN-02).
--
-- No se puede hacer ALTER de la cláusula WHERE de un EXCLUDE existente:
-- hay que borrarla y crear la nueva.
-- =============================================================================

ALTER TABLE turnos DROP CONSTRAINT excl_turnos_overlap;

ALTER TABLE turnos ADD CONSTRAINT excl_turnos_overlap
    EXCLUDE USING GIST (
        profesional_id          WITH =,
        tstzrange(inicio, fin, '[)') WITH &&
    ) WHERE (
        estado IN ('RESERVADO', 'CANCELADO_TARDE', 'AUSENTE', 'COMPLETADO')
        AND profesional_id IS NOT NULL
    );

COMMENT ON CONSTRAINT excl_turnos_overlap ON turnos IS 'Un profesional no puede tener dos turnos superpuestos salvo que el existente esté CANCELADO_EN_TIEMPO (único estado que libera el slot, RN-02/RN-03). AUSENTE y COMPLETADO bloquean igual que RESERVADO y CANCELADO_TARDE porque el slot ya fue ocupado (RN-08).';
