-- =============================================================================
-- Vitalys App — V10: calendario de feriados; el gimnasio no abre esos días
--
-- La grilla de V2/V9 solo conoce el día de la semana y la hora: sabe que el
-- domingo está cerrado, pero no que un martes puede ser feriado.
--
-- POR QUÉ NO SE CARGA UNA LISTA A MANO
-- El calendario argentino no es deducible. De los feriados de 2026 publicados
-- por el Ministerio del Interior:
--   · el trasladable del 17/06 (Güemes) cayó el 15/06,
--   · el del 20/11 (Soberanía Nacional) cayó el 23/11,
--   · y el 09/11 es feriado por la visita papal — declarado por decreto.
-- Ninguna lista escrita a mano puede contener un feriado creado por decreto, y
-- los trasladables se corren cada año. Escribirlos en una migración los
-- congelaría con la versión del esquema. La tabla se crea VACÍA y la puebla un
-- importador contra la fuente oficial (RF-38).
--
-- FUENTE OFICIAL
-- Dataset "Feriados Nacionales" del catálogo de datos abiertos del Estado
-- (datos.gob.ar), publicado por el Ministerio del Interior:
--   https://www.argentina.gob.ar/sites/default/files/holidays-<año>-es.json
-- Devuelve JSON-LD (schema.org): mainEntity.itemListElement[].item con
-- startDate, name y additionalProperty.value = tipo.
--
-- QUÉ TIPOS CIERRAN EL GIMNASIO
-- La fuente distingue cuatro tipos, y no todos son un cierre general:
--   · inamovible   -> cierra
--   · trasladable  -> cierra
--   · turistico    -> cierra (día no laborable con fines turísticos)
--   · no_laborable -> NO cierra: son festividades religiosas que rigen para
--                     quienes las profesan, no para el establecimiento.
-- Esa distinción se materializa en la columna cierra_gimnasio, que el
-- importador completa y el ADMIN puede corregir fila por fila: así el motor no
-- depende de reinterpretar el tipo, y un cierre propio del centro (mantenimiento,
-- feriado provincial) se carga como MANUAL sin pelear con la clasificación.
--
-- POR QUÉ NO VA EN fn_franja_gym_valida NI EN EL CHECK
-- Un CHECK no puede consultar otra tabla: PostgreSQL lo prohíbe porque la
-- restricción no se reevaluaría al cambiar esa tabla. Por eso
-- fn_franja_gym_valida es IMMUTABLE y solo mira el timestamp que recibe. La
-- validación del feriado va en el trigger trg_turno_gym, que es plpgsql, corre
-- en cada INSERT/UPDATE y ya consulta otras tablas.
--
-- Y TAMPOCO SE CONSULTA LA API AL RESERVAR
-- La reserva lee esta tabla, nunca la API. Una reserva no puede depender de que
-- un servicio externo responda: si la API se cae, el gimnasio deja de vender
-- turnos. El importador sincroniza por adelantado; la tabla es la fuente de
-- verdad del sistema.
--
-- LIMITACIÓN CONOCIDA
-- Cargar un feriado NO cancela los turnos ya reservados para esa fecha: el
-- trigger valida al insertar o modificar, no retroactivamente. Quien declara un
-- feriado con turnos ya tomados tiene que cancelarlos.
--
-- ALCANCE
-- Aplica a los turnos de GIMNASIO. Los de consultorio dependen de la
-- disponibilidad que carga cada profesional (RF-14), que es quien decide si
-- atiende un feriado.
-- =============================================================================

CREATE TYPE tipo_feriado   AS ENUM ('INAMOVIBLE', 'TRASLADABLE', 'TURISTICO', 'NO_LABORABLE');
CREATE TYPE origen_feriado AS ENUM ('OFICIAL', 'MANUAL');

CREATE TABLE feriados (
    fecha            DATE           PRIMARY KEY,
    descripcion      VARCHAR(200)   NOT NULL,
    tipo             tipo_feriado   NOT NULL,
    cierra_gimnasio  BOOLEAN        NOT NULL,
    origen           origen_feriado NOT NULL DEFAULT 'OFICIAL',
    sincronizado_en  TIMESTAMPTZ,
    creado_en        TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    actualizado_en   TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_feriado_descripcion_no_vacia CHECK (btrim(descripcion) <> ''),
    -- Un feriado importado tiene que registrar cuándo se sincronizó; uno
    -- cargado a mano por el ADMIN, no.
    CONSTRAINT chk_feriado_origen_sincronizado CHECK (
        (origen = 'OFICIAL' AND sincronizado_en IS NOT NULL)
        OR (origen = 'MANUAL' AND sincronizado_en IS NULL)
    )
);

COMMENT ON TABLE  feriados                 IS 'Calendario de días no laborables. Lo puebla el importador contra el dataset oficial del Ministerio del Interior (RF-38); el ADMIN puede corregir filas o agregar cierres propios del centro.';
COMMENT ON COLUMN feriados.fecha           IS 'Fecha del feriado en hora de Argentina. Clave primaria: una fila por fecha. La fuente oficial puede listar varias festividades el mismo día; el importador conserva la de mayor peso.';
COMMENT ON COLUMN feriados.tipo            IS 'Clasificación de la fuente oficial: INAMOVIBLE, TRASLADABLE, TURISTICO o NO_LABORABLE.';
COMMENT ON COLUMN feriados.cierra_gimnasio IS 'Si el gimnasio no abre ese día. El importador lo pone en TRUE salvo para NO_LABORABLE, que son festividades religiosas de quien las profesa y no un cierre del establecimiento. El ADMIN puede corregirlo.';
COMMENT ON COLUMN feriados.origen          IS 'OFICIAL: importado del dataset del Estado. MANUAL: cargado por el ADMIN (feriado provincial, cierre por mantenimiento).';
COMMENT ON COLUMN feriados.sincronizado_en IS 'Última sincronización con la fuente oficial. NULL en las filas manuales.';

CREATE INDEX idx_feriados_cierra ON feriados (fecha) WHERE cierra_gimnasio;

CREATE TRIGGER trg_feriados_updated
    BEFORE UPDATE ON feriados
    FOR EACH ROW EXECUTE FUNCTION fn_actualizar_timestamp();

-- -----------------------------------------------------------------------------
-- El trigger de gimnasio pasa a rechazar también los días de cierre.
-- Se redefine completo (viene de V8) para no dejar dos versiones dando vueltas.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_check_turno_gym()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_cupo        INT;
    v_ocupado     INT;
    v_fecha_local DATE;
    v_feriado     TEXT;
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

    -- Día de cierre. Se evalúa sobre la fecha local, igual que la grilla
    -- horaria, para que no dependa del timezone de la sesión.
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
