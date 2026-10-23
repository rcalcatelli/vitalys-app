-- =============================================================================
-- Vitalys App — V16: momento del check-in
--
-- Cambio `ui-pixel-perfect`. La pantalla de Ingreso muestra a qué hora se registró la
-- asistencia, pero el esquema solo guardaba el estado COMPLETADO. Se agrega
-- turnos.completado_en, que completa la aplicación al marcar COMPLETADO (RN-28).
--
-- Sin backfill: los turnos completados antes de esta migración quedan con NULL, porque
-- el momento real del check-in no se puede reconstruir y inventarlo sería mentir.
-- =============================================================================

ALTER TABLE turnos ADD COLUMN completado_en TIMESTAMPTZ;

ALTER TABLE turnos ADD CONSTRAINT chk_turno_completado_en CHECK (
    completado_en IS NULL OR estado = 'COMPLETADO'
);

COMMENT ON COLUMN turnos.completado_en IS 'Momento del check-in (RN-28). NULL en turnos completados antes de V16.';
