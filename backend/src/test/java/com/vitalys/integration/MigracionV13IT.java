package com.vitalys.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.sql.SQLException;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * V13 contra Postgres real: las tres reglas que cambia la migración, ejercitadas directo contra la
 * base (sin pasar por la API) porque es el motor el que las garantiza.
 */
class MigracionV13IT extends IntegrationTestBase {

    private static final String SQLSTATE_EXCLUSION_VIOLATION = "23P01";

    @Autowired
    private JdbcTemplate jdbc;

    private Long usuario(String rol) {
        return jdbc.queryForObject(
                "INSERT INTO usuarios (email, password_hash, rol) VALUES (?, 'x', ?::rol_usuario) RETURNING id",
                Long.class,
                "v13-" + UUID.randomUUID() + "@vitalys.test",
                rol);
    }

    private Long profesional() {
        return jdbc.queryForObject(
                "INSERT INTO profesionales (usuario_id, nombre, apellido, especialidad, duracion_turno_minutos) "
                        + "VALUES (?, 'Test', 'V13', 'NUTRICION', 30) RETURNING id",
                Long.class,
                usuario("PROFESIONAL"));
    }

    private Long persona(Long usuarioId) {
        return jdbc.queryForObject(
                "INSERT INTO personas (usuario_id, nombre, apellido, dni) VALUES (?, 'Pac', 'Test', ?) RETURNING id",
                Long.class,
                usuarioId,
                String.valueOf(ThreadLocalRandom.current().nextInt(10_000_000, 99_999_999)));
    }

    private int insertarTurnoCancelado(
            Long personaId, Long profesionalId, Long usuarioId, String inicio, String fin, String canceladoEn) {
        return jdbc.update(
                "INSERT INTO turnos (persona_id, profesional_id, tipo_turno, reservado_por_usuario_id, inicio, fin, "
                        + "estado, cancelado_en, cancelado_por_usuario, motivo_cancelacion) "
                        + "VALUES (?, ?, 'CONSULTORIO', ?, ?::timestamptz, ?::timestamptz, 'CANCELADO_POR_PROFESIONAL', "
                        + "?::timestamptz, ?, 'Reducción de disponibilidad')",
                personaId,
                profesionalId,
                usuarioId,
                inicio,
                fin,
                canceladoEn,
                usuarioId);
    }

    // --- 1. chk_cancelacion_info ---

    @Test
    void canceladoPorProfesional_sinQuienNiCuandoNiMotivo_laRechazaElCheck() {
        Long usuarioPaciente = usuario("SOCIO_PACIENTE");
        Long persona = persona(usuarioPaciente);
        Long profesional = profesional();

        assertThatThrownBy(() -> jdbc.update(
                        "INSERT INTO turnos (persona_id, profesional_id, tipo_turno, reservado_por_usuario_id, inicio, fin, estado) "
                                + "VALUES (?, ?, 'CONSULTORIO', ?, '2030-01-07 12:00-03', '2030-01-07 12:30-03', 'CANCELADO_POR_PROFESIONAL')",
                        persona,
                        profesional,
                        usuarioPaciente))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessageContaining("chk_cancelacion_info");
    }

    @Test
    void canceladoPorProfesional_completo_seAceptaYSigueValidandoLosOtrosEstados() {
        Long usuarioPaciente = usuario("SOCIO_PACIENTE");
        Long persona = persona(usuarioPaciente);
        Long profesional = profesional();

        int filas = insertarTurnoCancelado(
                persona, profesional, usuarioPaciente, "2030-01-07 12:00-03", "2030-01-07 12:30-03", "2030-01-01 10:00-03");
        assertThat(filas).isEqualTo(1);

        // La regla vieja se conserva: CANCELADO_TARDE tampoco puede ir sin firma
        assertThatThrownBy(() -> jdbc.update(
                        "INSERT INTO turnos (persona_id, profesional_id, tipo_turno, reservado_por_usuario_id, inicio, fin, estado) "
                                + "VALUES (?, ?, 'CONSULTORIO', ?, '2030-01-08 12:00-03', '2030-01-08 12:30-03', 'CANCELADO_TARDE')",
                        persona,
                        profesional,
                        usuarioPaciente))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    // --- 1.2 fn_turno_ocupa_lugar con el estado nuevo ---

    @Test
    void canceladoPorProfesional_antesDelInicio_liberaElLugar() {
        Long usuarioPaciente = usuario("SOCIO_PACIENTE");
        Long persona = persona(usuarioPaciente);
        Long profesional = profesional();
        insertarTurnoCancelado(
                persona, profesional, usuarioPaciente, "2030-01-07 12:00-03", "2030-01-07 12:30-03", "2030-01-01 10:00-03");

        // Mismo horario, mismo profesional: el EXCLUDE no lo bloquea porque el lugar se liberó
        int filas = jdbc.update(
                "INSERT INTO turnos (persona_id, profesional_id, tipo_turno, reservado_por_usuario_id, inicio, fin) "
                        + "VALUES (?, ?, 'CONSULTORIO', ?, '2030-01-07 12:00-03', '2030-01-07 12:30-03')",
                persona,
                profesional,
                usuarioPaciente);

        assertThat(filas).isEqualTo(1);
        assertThat(jdbc.queryForObject(
                        "SELECT fn_turno_ocupa_lugar('CANCELADO_POR_PROFESIONAL', '2030-01-07 12:00-03', '2030-01-01 10:00-03')",
                        Boolean.class))
                .isFalse();
    }

    @Test
    void canceladoPorProfesional_desdeElInicio_mantieneElLugarOcupado() {
        Long usuarioPaciente = usuario("SOCIO_PACIENTE");
        Long persona = persona(usuarioPaciente);
        Long profesional = profesional();
        insertarTurnoCancelado(
                persona, profesional, usuarioPaciente, "2030-01-07 12:00-03", "2030-01-07 12:30-03", "2030-01-07 12:05-03");

        assertThatThrownBy(() -> jdbc.update(
                        "INSERT INTO turnos (persona_id, profesional_id, tipo_turno, reservado_por_usuario_id, inicio, fin) "
                                + "VALUES (?, ?, 'CONSULTORIO', ?, '2030-01-07 12:00-03', '2030-01-07 12:30-03')",
                        persona,
                        profesional,
                        usuarioPaciente))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessageContaining("excl_turnos_overlap");
    }

    // --- 2. notificaciones.intentos / ultimo_intento_en ---

    @Test
    void notificaciones_tieneIntentosEnCeroPorDefectoYUltimoIntentoNulo() {
        Long usuarioPaciente = usuario("SOCIO_PACIENTE");
        Long persona = persona(usuarioPaciente);

        Long id = jdbc.queryForObject(
                "INSERT INTO notificaciones (persona_id, tipo, email_destino, exitoso) "
                        + "VALUES (?, 'AVISO_CANCELACION', 'pac@mail.test', FALSE) RETURNING id",
                Long.class,
                persona);

        assertThat(jdbc.queryForObject("SELECT intentos FROM notificaciones WHERE id = ?", Integer.class, id))
                .isZero();
        assertThat(jdbc.queryForObject("SELECT ultimo_intento_en FROM notificaciones WHERE id = ?", Object.class, id))
                .isNull();
    }

    // --- 3. fn_check_disponibilidad_overlap ---

    private void franja(Long profesional, int dia, String inicio, String fin) {
        jdbc.update(
                "INSERT INTO disponibilidad_profesional (profesional_id, dia_semana, hora_inicio, hora_fin) "
                        + "VALUES (?, ?, ?::time, ?::time)",
                profesional,
                dia,
                inicio,
                fin);
    }

    @Test
    void solapamiento_lanzaExclusionViolation() {
        Long profesional = profesional();
        franja(profesional, 1, "09:00", "13:00");

        assertThatThrownBy(() -> franja(profesional, 1, "12:00", "14:00"))
                .isInstanceOf(DataIntegrityViolationException.class)
                .satisfies(ex -> {
                    SQLException sql = (SQLException) causaSql(ex);
                    assertThat(sql.getSQLState()).isEqualTo(SQLSTATE_EXCLUSION_VIOLATION);
                });
    }

    @Test
    void franjasContiguas_ySolapesEnOtroDiaOProfesional_sonValidos() {
        Long profesional = profesional();
        franja(profesional, 1, "09:00", "13:00");

        franja(profesional, 1, "13:00", "17:00"); // contigua: fin de una = inicio de la otra
        franja(profesional, 2, "09:00", "13:00"); // otro día
        franja(profesional(), 1, "09:00", "13:00"); // otro profesional

        assertThat(jdbc.queryForObject(
                        "SELECT COUNT(*) FROM disponibilidad_profesional WHERE profesional_id = ?",
                        Integer.class,
                        profesional))
                .isEqualTo(3);
    }

    @Test
    void franjaInactiva_noColisionaPorSolapamiento() {
        Long profesional = profesional();
        franja(profesional, 3, "09:00", "13:00");

        int filas = jdbc.update(
                "INSERT INTO disponibilidad_profesional (profesional_id, dia_semana, hora_inicio, hora_fin, activo) "
                        + "VALUES (?, 3, '10:00', '12:00', FALSE)",
                profesional);

        assertThat(filas).isEqualTo(1);
    }

    private static Throwable causaSql(Throwable ex) {
        Throwable t = ex;
        while (t != null && !(t instanceof SQLException)) {
            t = t.getCause();
        }
        return t;
    }
}
