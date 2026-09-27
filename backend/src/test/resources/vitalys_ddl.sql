-- =============================================================================
-- Vitalys App — Esquema de Base de Datos (DDL)
-- PostgreSQL 15+
-- 2.ª Entrega — Trabajo Final Integrador (UTN TUP 2026)
-- Integrantes: Renzo Calcatelli · Pablo Basualdo Arcati
-- =============================================================================

-- Extensión necesaria para EXCLUDE USING GIST con rangos de timestamp
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Tipos enumerados
CREATE TYPE rol_usuario     AS ENUM ('SOCIO_PACIENTE', 'PROFESIONAL', 'ADMIN');
CREATE TYPE estado_persona  AS ENUM ('ACTIVO', 'INACTIVO');
CREATE TYPE especialidad    AS ENUM ('NUTRICION', 'PSICOLOGIA', 'KINESIOLOGIA');
CREATE TYPE estado_turno    AS ENUM ('RESERVADO', 'COMPLETADO', 'AUSENTE', 'CANCELADO_EN_TIEMPO', 'CANCELADO_TARDE');
CREATE TYPE concepto_pago      AS ENUM ('CUOTA_MENSUAL', 'SESION_CONSULTORIO');
CREATE TYPE tipo_turno        AS ENUM ('CONSULTORIO', 'GYM');
CREATE TYPE tipo_notificacion AS ENUM ('CONFIRMACION_TURNO', 'AVISO_CANCELACION', 'RECORDATORIO');

-- =============================================================================
-- TABLA: usuarios
-- Credenciales de acceso al sistema. Toda persona o profesional tiene un usuario.
-- =============================================================================
CREATE TABLE usuarios (
    id              BIGSERIAL       PRIMARY KEY,
    email           VARCHAR(255)    NOT NULL UNIQUE,
    password_hash   VARCHAR(255)    NOT NULL,
    rol             rol_usuario     NOT NULL,
    activo          BOOLEAN         NOT NULL DEFAULT TRUE,
    creado_en       TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    actualizado_en  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  usuarios              IS 'Credenciales y rol de acceso al sistema.';
COMMENT ON COLUMN usuarios.rol          IS 'SOCIO_PACIENTE, PROFESIONAL o ADMIN.';
COMMENT ON COLUMN usuarios.activo       IS 'FALSE equivale a cuenta deshabilitada (soft-disable).';

-- =============================================================================
-- TABLA: personas
-- Identidad única socio-paciente: una sola fila por persona real,
-- independientemente de si usa el gym, los consultorios, o ambos.
-- =============================================================================
CREATE TABLE personas (
    id                  BIGSERIAL       PRIMARY KEY,
    usuario_id          BIGINT          NOT NULL UNIQUE REFERENCES usuarios(id),
    nombre              VARCHAR(100)    NOT NULL,
    apellido            VARCHAR(100)    NOT NULL,
    dni                 VARCHAR(20)     NOT NULL UNIQUE,
    telefono            VARCHAR(30),
    fecha_nacimiento    DATE,
    estado              estado_persona  NOT NULL DEFAULT 'ACTIVO',
    es_socio_gym        BOOLEAN         NOT NULL DEFAULT FALSE,
    fecha_alta          DATE            NOT NULL DEFAULT CURRENT_DATE,
    fecha_baja          DATE,
    creado_en           TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    actualizado_en      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_fecha_baja CHECK (
        (estado = 'INACTIVO' AND fecha_baja IS NOT NULL AND fecha_baja >= fecha_alta)
        OR (estado = 'ACTIVO' AND fecha_baja IS NULL)
    )
);

COMMENT ON TABLE  personas                  IS 'Identidad única socio/paciente del centro.';
COMMENT ON COLUMN personas.es_socio_gym     IS 'TRUE si tiene membresía activa de gimnasio.';
COMMENT ON COLUMN personas.estado           IS 'INACTIVO = soft delete; conserva historial.';

-- =============================================================================
-- TABLA: profesionales
-- Un profesional tiene usuario propio y datos específicos de su especialidad.
-- =============================================================================
CREATE TABLE profesionales (
    id                          BIGSERIAL       PRIMARY KEY,
    usuario_id                  BIGINT          NOT NULL UNIQUE REFERENCES usuarios(id),
    nombre                      VARCHAR(100)    NOT NULL,
    apellido                    VARCHAR(100)    NOT NULL,
    especialidad                especialidad    NOT NULL,
    duracion_turno_minutos      INT             NOT NULL,
    activo                      BOOLEAN         NOT NULL DEFAULT TRUE,
    creado_en                   TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    actualizado_en              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_duracion_turno CHECK (duracion_turno_minutos > 0)
);

COMMENT ON TABLE  profesionales                         IS 'Profesionales del centro (Nutrición, Psicología, Kinesiología).';
COMMENT ON COLUMN profesionales.duracion_turno_minutos  IS 'Minutos por turno: 30 Nutrición, 50 Psicología, 45 Kinesiología (configurable).';

-- =============================================================================
-- TABLA: disponibilidad_profesional
-- Franjas horarias recurrentes en las que cada profesional atiende.
-- =============================================================================
CREATE TABLE disponibilidad_profesional (
    id                  BIGSERIAL   PRIMARY KEY,
    profesional_id      BIGINT      NOT NULL REFERENCES profesionales(id),
    dia_semana          SMALLINT    NOT NULL,   -- 1=Lunes … 7=Domingo (Java DayOfWeek)
    hora_inicio         TIME        NOT NULL,
    hora_fin            TIME        NOT NULL,
    activo              BOOLEAN     NOT NULL DEFAULT TRUE,
    creado_en           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_dia_semana   CHECK (dia_semana BETWEEN 1 AND 7),
    CONSTRAINT chk_horas        CHECK (hora_fin > hora_inicio),
    CONSTRAINT uq_disp          UNIQUE (profesional_id, dia_semana, hora_inicio)
);

COMMENT ON TABLE disponibilidad_profesional IS 'Franjas horarias semanales en que el profesional está disponible.';

-- =============================================================================
-- TABLA: turnos
-- Reserva de un slot entre una persona y un profesional.
-- =============================================================================
CREATE TABLE turnos (
    id                      BIGSERIAL       PRIMARY KEY,
    persona_id              BIGINT          NOT NULL REFERENCES personas(id),
    profesional_id          BIGINT          REFERENCES profesionales(id),  -- NULL si tipo_turno=GYM
    tipo_turno              tipo_turno      NOT NULL DEFAULT 'CONSULTORIO',
    reservado_por_usuario_id BIGINT         NOT NULL REFERENCES usuarios(id),
    inicio                  TIMESTAMPTZ     NOT NULL,
    fin                     TIMESTAMPTZ     NOT NULL,
    estado                  estado_turno    NOT NULL DEFAULT 'RESERVADO',
    cancelado_en            TIMESTAMPTZ,
    cancelado_por_usuario   BIGINT          REFERENCES usuarios(id),
    motivo_cancelacion      TEXT,
    creado_en               TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    actualizado_en          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_turno_fin        CHECK (fin > inicio),
    CONSTRAINT chk_cancelacion_info CHECK (
        (estado IN ('CANCELADO_EN_TIEMPO', 'CANCELADO_TARDE')
            AND cancelado_en IS NOT NULL
            AND cancelado_por_usuario IS NOT NULL
            AND motivo_cancelacion IS NOT NULL)
        OR estado NOT IN ('CANCELADO_EN_TIEMPO', 'CANCELADO_TARDE')
    ),
    CONSTRAINT chk_gym_sin_profesional CHECK (
        (tipo_turno = 'GYM' AND profesional_id IS NULL)
        OR (tipo_turno = 'CONSULTORIO' AND profesional_id IS NOT NULL)
    )
);

COMMENT ON TABLE  turnos                        IS 'Turnos reservados en los consultorios.';
COMMENT ON COLUMN turnos.estado                 IS 'CANCELADO_EN_TIEMPO: aviso ≥24h. CANCELADO_TARDE: aviso <24h.';
COMMENT ON COLUMN turnos.cancelado_por_usuario  IS 'NOT NULL cuando estado en CANCELADO_*. Registra quién ejecutó la cancelación (el propio socio o un admin).';

-- Restricción de solapamiento de turnos por profesional (solo turnos RESERVADOS y CONSULTORIO)
ALTER TABLE turnos ADD CONSTRAINT excl_turnos_overlap
    EXCLUDE USING GIST (
        profesional_id          WITH =,
        tstzrange(inicio, fin, '[)') WITH &&
    ) WHERE (estado IN ('RESERVADO', 'CANCELADO_TARDE') AND profesional_id IS NOT NULL);

-- Índice auxiliar para consultas por profesional e inicio
CREATE INDEX idx_turnos_profesional_inicio ON turnos (profesional_id, inicio)
    WHERE estado = 'RESERVADO';

-- Índice para consultas por persona
CREATE INDEX idx_turnos_persona ON turnos (persona_id);

-- =============================================================================
-- TABLA: pagos
-- Registro de pagos: cuotas mensuales de gym o sesiones de consultorio.
-- Pago completo únicamente (sin parciales en MVP).
-- =============================================================================
CREATE TABLE pagos (
    id                      BIGSERIAL       PRIMARY KEY,
    persona_id              BIGINT          NOT NULL REFERENCES personas(id),
    concepto                concepto_pago   NOT NULL,
    monto                   NUMERIC(10,2)   NOT NULL,
    periodo                 DATE,           -- Para CUOTA_MENSUAL: primer día del mes
    turno_id                BIGINT          REFERENCES turnos(id),  -- Para SESION_CONSULTORIO
    registrado_por_usuario  BIGINT          NOT NULL REFERENCES usuarios(id),
    fecha_pago              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    creado_en               TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_monto_positivo   CHECK (monto > 0),
    CONSTRAINT chk_concepto_datos   CHECK (
        (concepto = 'CUOTA_MENSUAL'      AND periodo IS NOT NULL AND turno_id IS NULL
                                         AND EXTRACT(DAY FROM periodo) = 1)
        OR
        (concepto = 'SESION_CONSULTORIO' AND turno_id IS NOT NULL AND periodo IS NULL)
    )
);

COMMENT ON TABLE  pagos                         IS 'Historial de pagos de cuotas y sesiones.';
COMMENT ON COLUMN pagos.periodo                 IS 'Mes al que corresponde la cuota (CUOTA_MENSUAL). Null para sesiones.';
COMMENT ON COLUMN pagos.turno_id                IS 'Turno asociado (SESION_CONSULTORIO). Null para cuotas.';
COMMENT ON COLUMN pagos.registrado_por_usuario  IS 'NOT NULL. En el MVP no existe registro automático: todos los pagos son ingresados por el ADMIN.';

-- Índice para consultar estado de cuenta de una persona
CREATE INDEX idx_pagos_persona ON pagos (persona_id, concepto, fecha_pago DESC);

-- Un turno solo puede tener un pago asociado (SESION_CONSULTORIO)
CREATE UNIQUE INDEX uq_pago_por_turno ON pagos (turno_id)
    WHERE turno_id IS NOT NULL;

-- Una persona solo puede tener una cuota por mes
CREATE UNIQUE INDEX uq_cuota_mensual ON pagos (persona_id, periodo)
    WHERE concepto = 'CUOTA_MENSUAL';

-- =============================================================================
-- TABLA: notificaciones
-- Registro de emails enviados (confirmaciones, recordatorios).
-- =============================================================================
CREATE TABLE notificaciones (
    id              BIGSERIAL       PRIMARY KEY,
    persona_id      BIGINT          NOT NULL REFERENCES personas(id),
    turno_id        BIGINT          REFERENCES turnos(id),
    tipo            tipo_notificacion NOT NULL,
    enviado_en      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    email_destino   VARCHAR(255)    NOT NULL,
    exitoso         BOOLEAN         NOT NULL DEFAULT TRUE,
    detalle_error   TEXT
);

COMMENT ON TABLE notificaciones IS 'Log de notificaciones por email enviadas a socios/pacientes.';

-- =============================================================================
-- FUNCIÓN: actualizar timestamp 'actualizado_en'
-- =============================================================================
CREATE OR REPLACE FUNCTION fn_actualizar_timestamp()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.actualizado_en = NOW();
    RETURN NEW;
END;
$$;

-- Triggers de actualización automática
CREATE TRIGGER trg_usuarios_updated
    BEFORE UPDATE ON usuarios
    FOR EACH ROW EXECUTE FUNCTION fn_actualizar_timestamp();

CREATE TRIGGER trg_personas_updated
    BEFORE UPDATE ON personas
    FOR EACH ROW EXECUTE FUNCTION fn_actualizar_timestamp();

CREATE TRIGGER trg_profesionales_updated
    BEFORE UPDATE ON profesionales
    FOR EACH ROW EXECUTE FUNCTION fn_actualizar_timestamp();

-- Función: rechaza franjas horarias superpuestas para el mismo profesional y día
CREATE OR REPLACE FUNCTION fn_check_disponibilidad_overlap()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM disponibilidad_profesional
        WHERE  profesional_id = NEW.profesional_id
          AND  dia_semana     = NEW.dia_semana
          AND  activo         = TRUE
          AND  id            <> COALESCE(NEW.id, -1)
          AND  hora_inicio    < NEW.hora_fin
          AND  hora_fin       > NEW.hora_inicio
    ) THEN
        RAISE EXCEPTION 'Solapamiento de disponibilidad: el profesional ya tiene una franja activa en ese día y horario.';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_disponibilidad_overlap
    BEFORE INSERT OR UPDATE ON disponibilidad_profesional
    FOR EACH ROW EXECUTE FUNCTION fn_check_disponibilidad_overlap();

CREATE TRIGGER trg_disponibilidad_updated
    BEFORE UPDATE ON disponibilidad_profesional
    FOR EACH ROW EXECUTE FUNCTION fn_actualizar_timestamp();

CREATE TRIGGER trg_turnos_updated
    BEFORE UPDATE ON turnos
    FOR EACH ROW EXECUTE FUNCTION fn_actualizar_timestamp();
