-- =============================================================================
-- Vitalys App — V13: ABM de profesionales, disponibilidad y avisos por email
--
-- Cambio `profesionales-disponibilidad` (Sprint 3). Esta migración junta los tres
-- ajustes de esquema que necesita el módulo, todos aditivos o de redefinición de
-- reglas; ninguna fila existente cambia de significado.
--
-- 1. chk_cancelacion_info NO CONOCE el estado nuevo de V12
-- V12 agregó CANCELADO_POR_PROFESIONAL al ENUM, pero el CHECK de V1 enumera a mano
-- los estados de cancelación que deben traer quién, cuándo y por qué:
--
--   · CANCELADO_EN_TIEMPO, CANCELADO_TARDE -> exigen cancelado_en,
--     cancelado_por_usuario y motivo_cancelacion
--   · cualquier otro estado               -> no exige nada
--
-- Un estado que no está en la lista cae en la segunda rama: un turno
-- CANCELADO_POR_PROFESIONAL podría guardarse sin saber quién lo canceló ni cuándo,
-- y justamente cancelado_en es lo que fn_turno_ocupa_lugar (V8) usa para decidir
-- si el lugar se libera. V12 explica por qué esa función no necesita tocarse; este
-- CHECK sí, porque a diferencia de ella enumera estados. Se lo redefine para que
-- la cascada de RN-24 no pueda dejar un turno cancelado "sin firma".
--
-- DROP + ADD y no un ALTER: PostgreSQL no permite modificar el cuerpo de un CHECK.
-- Al agregarlo valida las filas existentes, y ninguna está en el estado nuevo
-- todavía, así que no puede fallar.
--
-- 2. notificaciones: estado del envío SIN columna `estado`
-- El aviso de cancelación (RN-24) sale por email DESPUÉS del commit de la cascada y
-- se reintenta una vez si falla. Hace falta saber cuántos intentos hubo y cuándo fue
-- el último. Se agregan solo dos columnas:
--
--   · intentos          INT NOT NULL DEFAULT 0
--   · ultimo_intento_en TIMESTAMPTZ
--
-- No se agrega una columna `estado` (PENDIENTE/ENVIADA/FALLIDA) a propósito: sería
-- un dato derivado de los que ya existen y dos fuentes de verdad terminan
-- contradiciéndose (el mismo problema que V8 resolvió con una sola función). El
-- estado se deduce de (exitoso, intentos, ultimo_intento_en):
--
--   · exitoso                       -> enviada
--   · NOT exitoso AND intentos < 2  -> en curso, con el reintento pendiente
--   · NOT exitoso AND intentos >= 2 -> alerta definitiva para el ADMIN
--   · en curso hace más que el umbral (vitalys.email.umbral-huerfanas) -> huérfana:
--     la instancia se reinició entre el fallo y el reintento y nadie va a reintentar
--
-- Hay UNA fila por notificación y cada reintento la actualiza; no una fila por
-- intento. exitoso ya existía con DEFAULT TRUE (V1): la cascada inserta el aviso
-- con exitoso = FALSE e intentos = 0 y lo marca verdadero cuando el proveedor
-- responde bien.
--
-- 3. fn_check_disponibilidad_overlap: error distinguible y sin filas inactivas
-- La función de V1 lanza un RAISE EXCEPTION sin código, que PostgreSQL informa como
-- P0001 (raise_exception): indistinguible de cualquier otro error de PL/pgSQL, de
-- modo que el backend no puede traducirlo a 409 sin comparar el texto del mensaje.
-- Se le asigna el SQLSTATE de exclusion_violation, el mismo que ya produce
-- excl_turnos_overlap cuando dos turnos se pisan: un solapamiento es una violación
-- de exclusión, con el código que el estándar le reserva. El resto del backend
-- traduce estos errores localmente (no hay mapeo global confiable: el handler de
-- integridad de datos responde por defecto "el email ya está registrado").
--
-- Además se agrega la guarda NEW.activo. La versión de V1 comparaba contra las
-- franjas activas, pero rechazaba también una franja nueva INACTIVA que se
-- superponía con una activa, algo que no tiene sentido: una fila inactiva no ocupa
-- horario. (uq_disp no es parcial, así que una inactiva igual colisiona por inicio
-- idéntico; por eso la disponibilidad se borra físicamente y no se desactiva.)
-- Las franjas contiguas (fin de una = inicio de la otra) siguen permitidas: la
-- comparación es estricta (<, >).
--
-- Rollback: una V14 que restaure estas tres definiciones. V13 no se edita.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. CANCELADO_POR_PROFESIONAL también exige quién, cuándo y por qué
-- -----------------------------------------------------------------------------
ALTER TABLE turnos DROP CONSTRAINT chk_cancelacion_info;

ALTER TABLE turnos ADD CONSTRAINT chk_cancelacion_info CHECK (
    (estado IN ('CANCELADO_EN_TIEMPO', 'CANCELADO_TARDE', 'CANCELADO_POR_PROFESIONAL')
        AND cancelado_en IS NOT NULL
        AND cancelado_por_usuario IS NOT NULL
        AND motivo_cancelacion IS NOT NULL)
    OR estado NOT IN ('CANCELADO_EN_TIEMPO', 'CANCELADO_TARDE', 'CANCELADO_POR_PROFESIONAL')
);

COMMENT ON CONSTRAINT chk_cancelacion_info ON turnos IS
    'Toda cancelación (del paciente o del profesional) registra cuándo, quién y por qué.';

-- -----------------------------------------------------------------------------
-- 2. Reintento de avisos por email
-- -----------------------------------------------------------------------------
ALTER TABLE notificaciones
    ADD COLUMN intentos          INT         NOT NULL DEFAULT 0,
    ADD COLUMN ultimo_intento_en TIMESTAMPTZ;

COMMENT ON COLUMN notificaciones.intentos IS
    'Intentos de envío realizados (0 a 2). El estado de la notificación se deriva de '
    'exitoso + intentos + ultimo_intento_en; no hay columna estado.';
COMMENT ON COLUMN notificaciones.ultimo_intento_en IS
    'Momento del último intento de envío. NULL si todavía no hubo ninguno.';

-- -----------------------------------------------------------------------------
-- 3. Solapamiento de disponibilidad: SQLSTATE traducible y filas inactivas ignoradas
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_check_disponibilidad_overlap()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    -- Una franja inactiva no ocupa horario, no hay nada que comparar.
    IF NOT NEW.activo THEN
        RETURN NEW;
    END IF;

    IF EXISTS (
        SELECT 1 FROM disponibilidad_profesional
        WHERE  profesional_id = NEW.profesional_id
          AND  dia_semana     = NEW.dia_semana
          AND  activo         = TRUE
          AND  id            <> COALESCE(NEW.id, -1)
          AND  hora_inicio    < NEW.hora_fin
          AND  hora_fin       > NEW.hora_inicio
    ) THEN
        RAISE EXCEPTION 'Solapamiento de disponibilidad: el profesional ya tiene una franja activa en ese día y horario.'
            USING ERRCODE = 'exclusion_violation';
    END IF;
    RETURN NEW;
END;
$$;
