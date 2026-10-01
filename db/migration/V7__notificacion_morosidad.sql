-- =============================================================================
-- Vitalys App — V7: tipos de notificación de morosidad
--
-- Origen: RF-37, incorporado al reescribir RN-01 con umbral de tolerancia.
-- La regla nueva define un estado intermedio ("con deuda") en el que el socio
-- conserva el acceso mientras se le notifica. Sin un aviso previo, la suspensión
-- al alcanzar el umbral llegaría sin preaviso — exactamente el hueco que había
-- detectado el perfil SP-02 del relevamiento, y lo contrario de lo observado en
-- el Centro Deportivo Jerárquicos, donde la notificación progresiva precede al
-- bloqueo.
--
-- tipo_notificacion solo contemplaba eventos de turno (CONFIRMACION_TURNO,
-- AVISO_CANCELACION, RECORDATORIO). Se agregan los dos momentos del estado de
-- cuenta:
--
--   AVISO_DEUDA      — el socio acumula períodos impagos por debajo del umbral.
--                      Informativo: NO está bloqueado.
--   AVISO_SUSPENSION — alcanzó el umbral y quedó suspendido para gimnasio.
--
-- Estas notificaciones no se asocian a un turno: notificaciones.turno_id ya es
-- NULLABLE, así que no hace falta tocar la tabla.
--
-- Nota sobre ALTER TYPE ... ADD VALUE: desde PostgreSQL 12 puede ejecutarse
-- dentro de una transacción siempre que el valor nuevo no se USE en la misma
-- transacción. Esta migración solo lo agrega, así que es compatible con el
-- manejo transaccional de Flyway.
-- =============================================================================

ALTER TYPE tipo_notificacion ADD VALUE IF NOT EXISTS 'AVISO_DEUDA';
ALTER TYPE tipo_notificacion ADD VALUE IF NOT EXISTS 'AVISO_SUSPENSION';
