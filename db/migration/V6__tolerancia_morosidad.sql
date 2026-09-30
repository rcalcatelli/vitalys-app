-- =============================================================================
-- Vitalys App — V6: umbral de tolerancia de morosidad
--
-- Origen: relevamiento de campo en el Centro Deportivo Jerárquicos (28/09/2026),
-- hallazgo 7 del RFC-001. La versión anterior de RN-01 bloqueaba la reserva de
-- gimnasio ante la existencia de UN solo período impago. Ningún centro real
-- opera así: le conviene cobrar la deuda, no perder al socio.
--
-- Lo relevado: la deuda se acumula (los períodos impagos no se dan por perdidos,
-- que es lo que RN-01 ya resolvía bien), el socio sigue ingresando con normalidad
-- mientras se le notifica, y recién al alcanzar un umbral de períodos impagos
-- acumulados se lo suspende de la actividad del gimnasio. La prestación de salud
-- —en Vitalys, los turnos de consultorio— nunca se ve afectada.
--
-- Por qué un parámetro y no un literal: el umbral es una política comercial del
-- establecimiento, no una invariante del dominio. Un centro puede querer tolerar
-- dos períodos y otro seis. Vive junto a cupo_por_franja, que es un parámetro del
-- mismo tipo, en la fila única de configuracion_gym.
--
-- El valor por defecto (6) es el relevado en el establecimiento. Se documenta la
-- procedencia para que no parezca un número elegido al azar.
--
-- Esta migración solo agrega el parámetro. El cálculo de morosidad (RN-01) se
-- resuelve en la capa de servicio, no en el motor: depende de NOW() y de la
-- existencia de una excepción vigente (RN-09). Ver requerimientos.md.
-- =============================================================================

ALTER TABLE configuracion_gym
    ADD COLUMN meses_tolerancia_morosidad SMALLINT NOT NULL DEFAULT 6;

ALTER TABLE configuracion_gym
    ADD CONSTRAINT chk_tolerancia_morosidad_positiva
    CHECK (meses_tolerancia_morosidad > 0);

COMMENT ON COLUMN configuracion_gym.meses_tolerancia_morosidad IS
    'Cantidad de períodos mensuales impagos acumulados que se toleran antes de '
    'suspender al socio de la actividad del gimnasio (RN-01). Por debajo del '
    'umbral el socio conserva el acceso y solo se lo notifica. Nunca afecta los '
    'turnos de consultorio. Valor por defecto (6) relevado en el Centro '
    'Deportivo Jerárquicos, 28/09/2026.';
