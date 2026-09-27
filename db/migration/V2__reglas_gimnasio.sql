-- =============================================================================
-- Vitalys App — V2: reglas del gimnasio
-- Turnos de gym de horario fijo (60 min, en punto), con cupo por franja
-- para el gimnasio entero.
--
-- Qué valida la base (invariantes que valen siempre, sin importar cuándo se mire):
--   · grilla horaria: 60 min, hora en punto, L-V 07:00-21:00, sáb 09:00-12:00 (inicio)
--   · un solo turno de gym por persona y por día
--   · solo reservan personas con es_socio_gym = TRUE
--   · cupo máximo de personas por franja (configurable)
--
-- Qué queda en el backend (reglas que dependen de "ahora"):
--   · anticipación: hasta 7 días antes y como mínimo 1 hora antes del inicio
--   · cancelación en tiempo: hasta 2 horas antes (en consultorio siguen siendo 24)
--   · morosidad: bloqueo a los 10 días de vencida la cuota
--   · pasaje automático a AUSENTE de los turnos sin check-in al terminar la franja
--   · feriados (no hay tabla de feriados en el MVP)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- TABLA: configuracion_gym
-- Fila única con los parámetros del gimnasio.
-- -----------------------------------------------------------------------------
CREATE TABLE configuracion_gym (
    id                  SMALLINT    PRIMARY KEY DEFAULT 1,
    cupo_por_franja     INT         NOT NULL,
    actualizado_en      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_configuracion_gym_fila_unica CHECK (id = 1),
    CONSTRAINT chk_cupo_positivo                CHECK (cupo_por_franja > 0)
);

COMMENT ON TABLE  configuracion_gym                 IS 'Parámetros del gimnasio. Una sola fila (id = 1).';
COMMENT ON COLUMN configuracion_gym.cupo_por_franja IS 'Máximo de personas con turno activo en una misma franja de gym.';

INSERT INTO configuracion_gym (id, cupo_por_franja) VALUES (1, 20);

CREATE TRIGGER trg_configuracion_gym_updated
    BEFORE UPDATE ON configuracion_gym
    FOR EACH ROW EXECUTE FUNCTION fn_actualizar_timestamp();

-- -----------------------------------------------------------------------------
-- FUNCIÓN: fn_franja_gym_valida
-- TRUE si [inicio, fin) es una franja válida de la grilla del gimnasio,
-- evaluada en hora de Argentina (independiente del timezone de la sesión).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_franja_gym_valida(p_inicio TIMESTAMPTZ, p_fin TIMESTAMPTZ)
RETURNS BOOLEAN LANGUAGE sql IMMUTABLE AS $$
    SELECT p_fin - p_inicio = INTERVAL '1 hour'
       AND date_trunc('hour', l.ts) = l.ts
       AND (
            (EXTRACT(ISODOW FROM l.ts) BETWEEN 1 AND 5 AND l.ts::time BETWEEN TIME '07:00' AND TIME '21:00')
         OR (EXTRACT(ISODOW FROM l.ts) = 6           AND l.ts::time BETWEEN TIME '09:00' AND TIME '12:00')
       )
    FROM (SELECT p_inicio AT TIME ZONE 'America/Argentina/Buenos_Aires' AS ts) AS l;
$$;

COMMENT ON FUNCTION fn_franja_gym_valida(TIMESTAMPTZ, TIMESTAMPTZ) IS
    'Grilla del gym: 60 min en punto. Lun-Vie inicio 07:00-21:00, sáb 09:00-12:00, domingo cerrado.';

ALTER TABLE turnos ADD CONSTRAINT chk_turno_gym_grilla CHECK (
    tipo_turno <> 'GYM' OR fn_franja_gym_valida(inicio, fin)
);

-- -----------------------------------------------------------------------------
-- Un solo turno de gym por persona y por día (los cancelados no cuentan).
-- -----------------------------------------------------------------------------
CREATE UNIQUE INDEX uq_turno_gym_persona_dia ON turnos (
    persona_id,
    ((inicio AT TIME ZONE 'America/Argentina/Buenos_Aires')::date)
) WHERE tipo_turno = 'GYM'
    AND estado NOT IN ('CANCELADO_EN_TIEMPO', 'CANCELADO_TARDE');

-- Índice para contar ocupación por franja
CREATE INDEX idx_turnos_gym_inicio ON turnos (inicio)
    WHERE tipo_turno = 'GYM'
      AND estado NOT IN ('CANCELADO_EN_TIEMPO', 'CANCELADO_TARDE');

-- -----------------------------------------------------------------------------
-- FUNCIÓN + TRIGGER: socio de gym y cupo por franja
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_check_turno_gym()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_cupo    INT;
    v_ocupado INT;
BEGIN
    -- Solo interesan los turnos de gym que ocupan lugar
    IF NEW.tipo_turno <> 'GYM'
       OR NEW.estado IN ('CANCELADO_EN_TIEMPO', 'CANCELADO_TARDE') THEN
        RETURN NEW;
    END IF;

    -- En un UPDATE que no cambia franja ni pasa de cancelado a activo
    -- (por ejemplo RESERVADO -> COMPLETADO en el check-in) no hay nada que revisar.
    IF TG_OP = 'UPDATE'
       AND OLD.tipo_turno = 'GYM'
       AND OLD.inicio = NEW.inicio
       AND OLD.estado NOT IN ('CANCELADO_EN_TIEMPO', 'CANCELADO_TARDE') THEN
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
      AND  estado NOT IN ('CANCELADO_EN_TIEMPO', 'CANCELADO_TARDE')
      AND  id <> COALESCE(NEW.id, -1);

    IF v_ocupado >= v_cupo THEN
        RAISE EXCEPTION 'Cupo completo: la franja % ya tiene % de % lugares ocupados.',
            NEW.inicio, v_ocupado, v_cupo
            USING ERRCODE = 'check_violation';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_turno_gym
    BEFORE INSERT OR UPDATE OF tipo_turno, inicio, fin, estado, persona_id ON turnos
    FOR EACH ROW EXECUTE FUNCTION fn_check_turno_gym();

-- -----------------------------------------------------------------------------
-- Comentarios actualizados
-- -----------------------------------------------------------------------------
COMMENT ON TABLE  turnos        IS 'Turnos de consultorio (con profesional) y de gimnasio (sin profesional, con cupo por franja).';
COMMENT ON COLUMN turnos.estado IS 'CANCELADO_EN_TIEMPO: aviso ≥24h en consultorio, ≥2h en gym. CANCELADO_TARDE: aviso con menos anticipación. En gym, COMPLETADO lo marca el ADMIN en el check-in y AUSENTE se asigna al terminar la franja.';
