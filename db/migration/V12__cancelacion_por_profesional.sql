-- =============================================================================
-- Vitalys App — V12: estado CANCELADO_POR_PROFESIONAL
--
-- Devolución de la 2.ª entrega (punto 7, hallazgo 5 del RFC-001): qué pasa con
-- los turnos ya reservados cuando un profesional reduce su disponibilidad.
--
-- DECISIÓN: se cancelan en cascada y se notifica a los pacientes (RN-24).
--
-- POR QUÉ HACE FALTA UN ESTADO NUEVO
-- La cascada tiene que dejar registrado que el turno se canceló, y los dos
-- estados existentes describen la anticipación con la que avisó EL PACIENTE:
--
--   · CANCELADO_EN_TIEMPO  -> el paciente avisó con la anticipación requerida
--   · CANCELADO_TARDE      -> el paciente avisó sobre la hora
--
-- Usar cualquiera de los dos para una cancelación que decidió el profesional le
-- atribuye al paciente un acto que no cometió. Con CANCELADO_TARDE, además, el
-- paciente quedaría marcado como cancelador tardío reiterado (RN-02) por algo
-- que no hizo. Y con CANCELADO_EN_TIEMPO cualquier estadística de cancelaciones
-- mezclaría dos hechos distintos.
--
-- cancelado_por_usuario ya permite saber QUIÉN canceló, pero obliga a un join
-- para interpretar el estado. Un dato que necesita otra tabla para no mentir es
-- un dato mal modelado.
--
-- POR QUÉ NO HAY QUE TOCAR NADA MÁS
-- fn_turno_ocupa_lugar (V8) no enumera los estados de cancelación: pregunta si
-- el estado es RESERVADO/COMPLETADO/AUSENTE, y si no, mira si cancelado_en cayó
-- a partir del inicio de la franja. El estado nuevo entra solo, con el
-- comportamiento correcto: libera el lugar si se canceló antes del inicio. El
-- EXCLUDE de consultorio, el cupo de gimnasio y el índice de un turno por día
-- heredan la regla sin modificarse. Esa es la ventaja de haber centralizado la
-- definición en una función en lugar de repetir la lista de estados.
--
-- ALTER TYPE ... ADD VALUE no invalida los índices existentes: agrega una
-- etiqueta al tipo, no cambia la representación de los valores ya almacenados.
-- =============================================================================

ALTER TYPE estado_turno ADD VALUE IF NOT EXISTS 'CANCELADO_POR_PROFESIONAL';

COMMENT ON COLUMN turnos.estado IS
    'CANCELADO_EN_TIEMPO: el paciente avisó con >=24h en consultorio o >=2h en gym. '
    'CANCELADO_TARDE: el paciente avisó con menos anticipación. '
    'CANCELADO_POR_PROFESIONAL: lo canceló el profesional al reducir su disponibilidad '
    '(RN-24); no computa como cancelación del paciente. Los tres registran quién y con '
    'qué anticipación avisó; que el lugar se libere o no depende de si cancelado_en es '
    'anterior al inicio del turno (RN-02). En gym, COMPLETADO lo marca el ADMIN en el '
    'check-in y AUSENTE se asigna al terminar la franja.';
