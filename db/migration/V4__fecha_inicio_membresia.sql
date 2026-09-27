-- =============================================================================
-- Vitalys App — V4: `personas.fecha_inicio_membresia`
--
-- Devolución de la 2.ª entrega (punto 6): no había forma de saber desde qué
-- mes se deben cuotas de gimnasio. Calcularlo por "último período pagado"
-- deja pasar meses salteados sin pago, y un socio recién dado de alta
-- quedaría bloqueado desde el primer día (sin cuotas pagadas = "vencido").
--
-- Esta migración solo agrega la columna de esquema. El cálculo de morosidad
-- a partir de fecha_inicio_membresia (RN-01) lo redacta otro agente en
-- requerimientos.md; no se toca esa regla acá.
--
-- Relación con es_socio_gym: solo quien es socio de gimnasio tiene fecha de
-- inicio de membresía. Una persona que solo usa consultorio no la tiene.
-- =============================================================================

ALTER TABLE personas ADD COLUMN fecha_inicio_membresia DATE;

-- Backfill: para las filas existentes que ya son socias de gym, se asume que
-- la membresía arrancó junto con el alta de la persona (fecha_alta). No hay
-- forma de reconstruir una fecha distinta a partir de los datos ya cargados.
UPDATE personas
   SET fecha_inicio_membresia = fecha_alta
 WHERE es_socio_gym = TRUE
   AND fecha_inicio_membresia IS NULL;

ALTER TABLE personas ADD CONSTRAINT chk_fecha_inicio_membresia CHECK (
    (es_socio_gym = TRUE  AND fecha_inicio_membresia IS NOT NULL)
    OR
    (es_socio_gym = FALSE AND fecha_inicio_membresia IS NULL)
);

COMMENT ON COLUMN personas.fecha_inicio_membresia IS 'Mes/día desde el que se deben cuotas de gimnasio. NOT NULL sii es_socio_gym = TRUE (ver chk_fecha_inicio_membresia). La API la exige al dar de alta o activar es_socio_gym; evita que un socio nuevo aparezca moroso desde el día 1 y que "último período pagado" salte meses sin pagar.';
