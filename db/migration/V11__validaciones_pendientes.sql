-- =============================================================================
-- Vitalys App — V11: las cinco validaciones pendientes
--
-- Devolución de la 2.ª entrega (punto 6). Los cinco casos estaban sin definir y
-- la base los aceptaba. Verificado contra Postgres antes de escribir esto:
--
--   a) pago de sesión de consultorio asociado a un turno de gimnasio        -> aceptaba
--   b) pago de sesión a nombre de una persona distinta a la del turno       -> aceptaba
--   c) turno de consultorio para una persona dada de baja                   -> aceptaba
--   d) dos turnos superpuestos para la misma persona                        -> aceptaba
--   e) excepción de morosidad asociada al turno de otra persona             -> aceptaba
--
-- DECISIÓN: los cinco quedan PROHIBIDOS, y los cinco se validan en la BASE.
--
-- Por qué en la base y no en el servicio: son invariantes de integridad, no
-- reglas dependientes del momento. Ninguno usa NOW() ni depende del actor. Una
-- regla así, validada solo en la capa de servicio, se rompe con cualquier carga
-- por fuera de la API — una corrección manual, una importación, un script — y
-- deja datos que contradicen el modelo. Las reglas que sí dependen de NOW()
-- (morosidad RN-01, anticipación de cancelación RN-02) siguen en el servicio.
--
-- Por qué con TRIGGERS y no con CHECK: los cinco cruzan tablas. Un CHECK solo
-- puede mirar columnas de su propia fila; PostgreSQL prohíbe las subconsultas
-- justamente porque la restricción no se reevaluaría al cambiar la otra tabla.
-- La excepción es (d), que se resuelve con un EXCLUDE.
--
-- Nota sobre chk_concepto_datos (V1): ya exigía que un SESION_CONSULTORIO tenga
-- turno_id y que un CUOTA_MENSUAL no lo tenga. Eso es lo que un CHECK alcanza a
-- ver. Lo que faltaba es de qué TIPO es ese turno y de QUIÉN es.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- (a) y (b) — coherencia entre el pago de sesión y su turno
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_check_pago_sesion()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_tipo       tipo_turno;
    v_persona_id BIGINT;
BEGIN
    IF NEW.concepto <> 'SESION_CONSULTORIO' THEN
        RETURN NEW;
    END IF;

    SELECT tipo_turno, persona_id INTO v_tipo, v_persona_id
    FROM turnos WHERE id = NEW.turno_id;

    -- (a) Un turno de gimnasio no genera honorarios de sesión: no hay profesional
    -- que atienda. Lo que se cobra del gimnasio es la cuota mensual.
    IF v_tipo <> 'CONSULTORIO' THEN
        RAISE EXCEPTION
            'El turno % es de tipo %: un pago SESION_CONSULTORIO solo puede asociarse a un turno de CONSULTORIO.',
            NEW.turno_id, v_tipo
            USING ERRCODE = 'check_violation';
    END IF;

    -- (b) La sesión la debe quien la recibió. Si un tercero paga por otro, el
    -- estado de cuenta de ambos queda mal: a uno le figura un pago que no le
    -- corresponde y al otro le sigue faltando el suyo.
    IF v_persona_id <> NEW.persona_id THEN
        RAISE EXCEPTION
            'El pago es de la persona % pero el turno % es de la persona %: un pago de sesión se registra a nombre de quien recibió la atención.',
            NEW.persona_id, NEW.turno_id, v_persona_id
            USING ERRCODE = 'check_violation';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_pago_sesion
    BEFORE INSERT OR UPDATE OF concepto, turno_id, persona_id ON pagos
    FOR EACH ROW EXECUTE FUNCTION fn_check_pago_sesion();

COMMENT ON FUNCTION fn_check_pago_sesion() IS
    'Un pago SESION_CONSULTORIO tiene que apuntar a un turno de CONSULTORIO y estar '
    'a nombre de la persona de ese turno (devolución 2.ª entrega, punto 6 a y b).';

-- -----------------------------------------------------------------------------
-- (c) — no se reservan turnos para una persona dada de baja
--
-- Vale para los DOS tipos de turno. Antes solo lo verificaba el trigger del
-- gimnasio, así que un turno de consultorio para alguien INACTIVO entraba sin
-- problema. Se saca de fn_check_turno_gym para que la regla viva en un solo
-- lugar: ahí queda únicamente lo que es propio del gimnasio (ser socio).
--
-- El trigger corre al insertar o modificar un turno. Dar de baja a una persona
-- NO invalida los turnos que ya tenía — es un hecho histórico, y su turno de la
-- semana pasada siguió existiendo. Cancelar los turnos futuros de quien se da de
-- baja es responsabilidad del caso de uso de baja (RF-08), no de esta regla.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_check_turno_persona_activa()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_estado estado_persona;
BEGIN
    -- Un turno que no ocupa lugar (cancelado antes del inicio) no se valida:
    -- cancelar tiene que seguir siendo posible aunque la persona ya no esté activa.
    IF NOT fn_turno_ocupa_lugar(NEW.estado, NEW.inicio, NEW.cancelado_en) THEN
        RETURN NEW;
    END IF;

    -- En un UPDATE que no cambia la persona ni la franja tampoco hay nada nuevo
    -- que revisar: marcar COMPLETADO o AUSENTE sobre un turno ya existente no
    -- puede fallar porque entretanto se haya dado de baja a la persona.
    IF TG_OP = 'UPDATE'
       AND OLD.persona_id = NEW.persona_id
       AND OLD.inicio = NEW.inicio THEN
        RETURN NEW;
    END IF;

    SELECT estado INTO v_estado FROM personas WHERE id = NEW.persona_id;

    IF v_estado <> 'ACTIVO' THEN
        RAISE EXCEPTION 'La persona % está dada de baja: no se le pueden reservar turnos.',
            NEW.persona_id
            USING ERRCODE = 'check_violation';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_turno_persona_activa
    BEFORE INSERT OR UPDATE OF persona_id, inicio, fin, estado ON turnos
    FOR EACH ROW EXECUTE FUNCTION fn_check_turno_persona_activa();

COMMENT ON FUNCTION fn_check_turno_persona_activa() IS
    'No se reservan turnos, de ningún tipo, para una persona INACTIVA (devolución '
    '2.ª entrega, punto 6 c). Dar de baja no invalida los turnos ya existentes.';

-- fn_check_turno_gym deja de verificar el estado de la persona: ahora lo cubre
-- el trigger de arriba para los dos tipos de turno. Acá queda solo lo propio del
-- gimnasio, que es la membresía.
CREATE OR REPLACE FUNCTION fn_check_turno_gym()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_cupo        INT;
    v_ocupado     INT;
    v_fecha_local DATE;
    v_feriado     TEXT;
BEGIN
    IF NEW.tipo_turno <> 'GYM'
       OR NOT fn_turno_ocupa_lugar(NEW.estado, NEW.inicio, NEW.cancelado_en) THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'UPDATE'
       AND OLD.tipo_turno = 'GYM'
       AND OLD.inicio = NEW.inicio
       AND fn_turno_ocupa_lugar(OLD.estado, OLD.inicio, OLD.cancelado_en) THEN
        RETURN NEW;
    END IF;

    v_fecha_local := (NEW.inicio AT TIME ZONE 'America/Argentina/Buenos_Aires')::date;

    SELECT descripcion INTO v_feriado
    FROM   feriados
    WHERE  fecha = v_fecha_local
      AND  cierra_gimnasio;

    IF v_feriado IS NOT NULL THEN
        RAISE EXCEPTION 'El gimnasio no abre el % (%).', v_fecha_local, v_feriado
            USING ERRCODE = 'check_violation';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM personas
        WHERE  id = NEW.persona_id
          AND  es_socio_gym = TRUE
    ) THEN
        RAISE EXCEPTION 'La persona % no tiene membresía de gimnasio.', NEW.persona_id
            USING ERRCODE = 'check_violation';
    END IF;

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

-- -----------------------------------------------------------------------------
-- (d) — una persona no puede estar en dos turnos a la vez
--
-- Vale entre tipos: nadie puede estar entrenando en el gimnasio y sentado en un
-- consultorio al mismo tiempo. Es el espejo de excl_turnos_overlap, que impide
-- la superposición del lado del profesional; faltaba el lado de la persona.
--
-- Reutiliza fn_turno_ocupa_lugar (V8): una cancelación previa al inicio libera
-- el horario y permite reservar otra cosa en esa franja.
-- -----------------------------------------------------------------------------
ALTER TABLE turnos ADD CONSTRAINT excl_turnos_persona_overlap
    EXCLUDE USING GIST (
        persona_id                   WITH =,
        tstzrange(inicio, fin, '[)') WITH &&
    ) WHERE (
        fn_turno_ocupa_lugar(estado, inicio, cancelado_en)
    );

COMMENT ON CONSTRAINT excl_turnos_persona_overlap ON turnos IS
    'Una persona no puede tener dos turnos superpuestos, ni siquiera de tipos '
    'distintos (devolución 2.ª entrega, punto 6 d).';

-- -----------------------------------------------------------------------------
-- (e) — una excepción de morosidad no puede apuntar al turno de otra persona
--
-- Y el problema de fondo que señala la devolución: la excepción sirve para PODER
-- reservar, así que cuando se la necesita el turno todavía no existe. Un turno_id
-- cargado de entrada es imposible de completar en el momento en que hace falta.
--
-- Se invierte el sentido de la columna: turno_id deja de ser un dato de entrada y
-- pasa a registrar QUÉ TURNO CONSUMIÓ la excepción. Lo escribe el servicio
-- después de crear el turno. Eso además le da sentido a "puntual": con
-- un_solo_uso = TRUE la excepción vale para una sola reserva y se agota al usarse
-- (turno_id deja de ser NULL); con FALSE vale para cualquier turno hasta
-- valida_hasta.
--
-- Vigencia de una excepción, tal como la consulta el servicio:
--     valida_hasta >= CURRENT_DATE
--     AND (NOT un_solo_uso OR turno_id IS NULL)
-- -----------------------------------------------------------------------------
ALTER TABLE excepciones_morosidad
    ADD COLUMN un_solo_uso BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN excepciones_morosidad.un_solo_uso IS
    'TRUE: la excepción habilita una sola reserva y se agota al usarse. FALSE: vale '
    'para cualquier turno de gimnasio hasta valida_hasta.';

COMMENT ON COLUMN excepciones_morosidad.turno_id IS
    'Turno que CONSUMIÓ la excepción; lo completa el servicio después de crearlo. '
    'NULL mientras no se usó. No es un dato de alta: cuando la excepción hace falta, '
    'el turno todavía no existe.';

CREATE OR REPLACE FUNCTION fn_check_excepcion_morosidad()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_persona_id BIGINT;
BEGIN
    IF NEW.turno_id IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT persona_id INTO v_persona_id FROM turnos WHERE id = NEW.turno_id;

    IF v_persona_id <> NEW.persona_id THEN
        RAISE EXCEPTION
            'La excepción es de la persona % pero el turno % es de la persona %: una excepción solo puede consumirse en un turno de su propio beneficiario.',
            NEW.persona_id, NEW.turno_id, v_persona_id
            USING ERRCODE = 'check_violation';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_excepcion_morosidad
    BEFORE INSERT OR UPDATE OF persona_id, turno_id ON excepciones_morosidad
    FOR EACH ROW EXECUTE FUNCTION fn_check_excepcion_morosidad();

COMMENT ON FUNCTION fn_check_excepcion_morosidad() IS
    'El turno que consume una excepción tiene que ser de la persona beneficiada '
    '(devolución 2.ª entrega, punto 6 e).';
