-- =============================================================================
-- Vitalys App — V8: el lugar se ocupa cuando el turno empezó, no según el estado
--
-- Origen: relevamiento de campo en el Centro Deportivo Jerárquicos, ampliación
-- del 28/09/2026, y devolución de la 2.ª entrega (punto 4).
--
-- EL PROBLEMA
-- RN-02 decía que un turno CANCELADO_TARDE mantiene el lugar bloqueado en los
-- dos tipos de turno. La base hacía dos cosas distintas: en consultorio lo
-- bloqueaba (excl_turnos_overlap incluía CANCELADO_TARDE desde V5), y en
-- gimnasio lo liberaba (el conteo de cupo excluía las dos cancelaciones).
-- Verificado: con cupo 1, un cancelado tarde dejaba entrar a otra persona.
--
-- LO RELEVADO
-- En Jerárquicos, tanto en gimnasio como en clínica, una cancelación LIBERA el
-- lugar para que otra persona lo tome. Lo que bloquea es cancelar una vez que
-- el turno YA EMPEZÓ: un turno de las 14:00 cancelado a las 14:01 queda
-- bloqueado, en ambos tipos.
--
-- LA REGLA QUE SE DESPRENDE
-- El discriminante no es el estado ni el umbral de anticipación, sino si la
-- cancelación llegó antes del inicio del turno. Y resulta ser el mismo
-- principio que ya gobernaba AUSENTE (RN-08): una vez que la franja empezó, el
-- lugar se consumió — se haya asistido, faltado, o avisado tarde. Pasa a ser
-- una sola regla en lugar de una lista de estados por tipo de turno.
--
-- El umbral de anticipación (24 h en consultorio, 2 h en gimnasio) NO
-- desaparece: sigue determinando si la cancelación se registra como
-- CANCELADO_EN_TIEMPO o CANCELADO_TARDE, que es el dato con el que se puede
-- sancionar a quien cancela tarde de forma reiterada. Lo que deja de hacer es
-- decidir si el lugar se libera.
--
-- NOTA SOBRE fn_turno_ocupa_lugar EN PREDICADOS DE ÍNDICE
-- La función se usa dentro del WHERE de un EXCLUDE y de dos índices parciales,
-- así que DEBE ser IMMUTABLE y no puede cambiar de semántica sin recrear esos
-- objetos: PostgreSQL no reconstruye un índice porque se haya redefinido una
-- función. Si alguna vez hay que modificar esta regla, la migración que lo haga
-- tiene que borrar y volver a crear la constraint y los dos índices, como hace
-- esta. Se centraliza igual porque el riesgo real es el opuesto: que las tres
-- reglas se desincronicen, que es exactamente lo que pasó entre V1, V2 y V5.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- La definición única de "este turno ocupa el lugar"
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_turno_ocupa_lugar(
    p_estado       estado_turno,
    p_inicio       TIMESTAMPTZ,
    p_cancelado_en TIMESTAMPTZ
) RETURNS BOOLEAN
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
    -- Un turno vigente o ya transcurrido ocupa el lugar. Una cancelación lo
    -- libera solo si llegó ANTES del inicio de la franja; registrada a partir
    -- del inicio (p_cancelado_en >= p_inicio), el lugar ya se consumió.
    SELECT p_estado IN ('RESERVADO', 'COMPLETADO', 'AUSENTE')
        OR (p_cancelado_en IS NOT NULL AND p_cancelado_en >= p_inicio);
$$;

COMMENT ON FUNCTION fn_turno_ocupa_lugar(estado_turno, TIMESTAMPTZ, TIMESTAMPTZ) IS
    'Definición única de si un turno ocupa su lugar (RN-02, RN-03, RN-08). La '
    'usan el EXCLUDE de consultorio, el cupo de gimnasio y el índice de un turno '
    'de gym por persona y día, para que no puedan divergir entre sí.';

-- -----------------------------------------------------------------------------
-- 1. Consultorio — solapamiento por profesional
-- -----------------------------------------------------------------------------
ALTER TABLE turnos DROP CONSTRAINT excl_turnos_overlap;

ALTER TABLE turnos ADD CONSTRAINT excl_turnos_overlap
    EXCLUDE USING GIST (
        profesional_id               WITH =,
        tstzrange(inicio, fin, '[)') WITH &&
    ) WHERE (
        profesional_id IS NOT NULL
        AND fn_turno_ocupa_lugar(estado, inicio, cancelado_en)
    );

COMMENT ON CONSTRAINT excl_turnos_overlap ON turnos IS
    'Un profesional no puede tener dos turnos superpuestos. Una cancelación '
    'libera el horario si llegó antes del inicio del turno, sin importar si fue '
    'en tiempo o tarde; a partir del inicio el horario sigue bloqueado, igual '
    'que con AUSENTE y COMPLETADO (RN-02, RN-03, RN-08).';

-- -----------------------------------------------------------------------------
-- 2. Gimnasio — un solo turno por persona y por día
-- -----------------------------------------------------------------------------
DROP INDEX uq_turno_gym_persona_dia;

CREATE UNIQUE INDEX uq_turno_gym_persona_dia ON turnos (
    persona_id,
    ((inicio AT TIME ZONE 'America/Argentina/Buenos_Aires')::date)
) WHERE tipo_turno = 'GYM'
    AND fn_turno_ocupa_lugar(estado, inicio, cancelado_en);

-- -----------------------------------------------------------------------------
-- 3. Gimnasio — índice de apoyo para contar ocupación por franja
-- -----------------------------------------------------------------------------
DROP INDEX idx_turnos_gym_inicio;

CREATE INDEX idx_turnos_gym_inicio ON turnos (inicio)
    WHERE tipo_turno = 'GYM'
      AND fn_turno_ocupa_lugar(estado, inicio, cancelado_en);

-- -----------------------------------------------------------------------------
-- 4. Gimnasio — cupo por franja y socio habilitado
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_check_turno_gym()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_cupo    INT;
    v_ocupado INT;
BEGIN
    -- Solo interesan los turnos de gym que ocupan lugar.
    IF NEW.tipo_turno <> 'GYM'
       OR NOT fn_turno_ocupa_lugar(NEW.estado, NEW.inicio, NEW.cancelado_en) THEN
        RETURN NEW;
    END IF;

    -- En un UPDATE que no cambia la franja y que ya ocupaba lugar antes
    -- (por ejemplo RESERVADO -> COMPLETADO en el check-in) no hay nada que revisar.
    IF TG_OP = 'UPDATE'
       AND OLD.tipo_turno = 'GYM'
       AND OLD.inicio = NEW.inicio
       AND fn_turno_ocupa_lugar(OLD.estado, OLD.inicio, OLD.cancelado_en) THEN
        RETURN NEW;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM personas
        WHERE  id = NEW.persona_id
          AND  es_socio_gym = TRUE
          AND  estado = 'ACTIVO'
    ) THEN
        RAISE EXCEPTION 'La persona % no es socia activa del gimnasio.', NEW.persona_id
            USING ERRCODE = 'check_violation';
    END IF;

    -- Serializa las reservas concurrentes de la misma franja: sin este lock,
    -- dos transacciones simultáneas podrían ver 19 ocupados y reservar la 20 y la 21.
    PERFORM pg_advisory_xact_lock(EXTRACT(EPOCH FROM NEW.inicio)::BIGINT);

    SELECT cupo_por_franja INTO v_cupo FROM configuracion_gym WHERE id = 1;

    SELECT COUNT(*) INTO v_ocupado
    FROM   turnos
    WHERE  tipo_turno = 'GYM'
      AND  inicio     = NEW.inicio
      AND  fn_turno_ocupa_lugar(estado, inicio, cancelado_en)
      AND  id <> COALESCE(NEW.id, -1);

    IF v_ocupado >= v_cupo THEN
        RAISE EXCEPTION 'Cupo completo: la franja % ya tiene % de % lugares ocupados.',
            NEW.inicio, v_ocupado, v_cupo
            USING ERRCODE = 'check_violation';
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON COLUMN turnos.estado IS
    'CANCELADO_EN_TIEMPO: aviso >=24h en consultorio, >=2h en gym. '
    'CANCELADO_TARDE: aviso con menos anticipación. El estado registra la '
    'anticipación del aviso; que el lugar se libere o no depende de si la '
    'cancelación llegó antes del inicio del turno (RN-02). En gym, COMPLETADO lo '
    'marca el ADMIN en el check-in y AUSENTE se asigna al terminar la franja.';
