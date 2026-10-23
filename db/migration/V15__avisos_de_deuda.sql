-- =============================================================================
-- Vitalys App — V15: avisos de deuda y de suspensión (RF-37)
--
-- RF-37 pide avisar al socio de gimnasio cada vez que un período mensual pasa a
-- impago, y que el aviso que alcanza el umbral comunique la suspensión. Los dos
-- tipos (AVISO_DEUDA y AVISO_SUSPENSION) existen desde V7, pero faltaba saber a
-- qué período corresponde cada aviso.
--
-- La columna periodo es esa marca: el job diario arma un aviso para el período
-- impago más reciente, y el índice único impide un segundo aviso para la misma
-- persona y el mismo período. Así el job puede correr varias veces, o reiniciarse
-- el servicio, sin mandar dos veces lo mismo. Un socio que llega con varios meses
-- impagos recibe un único aviso (el del último), no uno por mes atrasado.
--
-- Solo los avisos de deuda llevan período; los de turnos lo dejan en NULL.
-- =============================================================================

ALTER TABLE notificaciones ADD COLUMN periodo DATE;

ALTER TABLE notificaciones ADD CONSTRAINT chk_notificacion_periodo CHECK (
    (tipo IN ('AVISO_DEUDA', 'AVISO_SUSPENSION') AND periodo IS NOT NULL AND EXTRACT(DAY FROM periodo) = 1)
    OR (tipo NOT IN ('AVISO_DEUDA', 'AVISO_SUSPENSION') AND periodo IS NULL)
);

CREATE UNIQUE INDEX uq_aviso_deuda_periodo ON notificaciones (persona_id, periodo)
    WHERE periodo IS NOT NULL;

COMMENT ON COLUMN notificaciones.periodo IS
    'Período impago que originó un AVISO_DEUDA o AVISO_SUSPENSION (primer día del mes). '
    'NULL para los avisos de turnos. Con uq_aviso_deuda_periodo, un solo aviso por período.';
