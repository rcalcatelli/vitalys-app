package com.vitalys.integration;

import com.vitalys.domain.RolUsuario;
import com.vitalys.domain.Usuario;
import com.vitalys.dto.LoginResponse;
import com.vitalys.repository.UsuarioRepository;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.temporal.TemporalAdjusters;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * Escenario común de la cascada (RN-24 / RN-25): un profesional con franjas lunes y miércoles de
 * 09:00 a 13:00, dos pacientes y turnos de consultorio FUTUROS insertados por JDBC. Las fechas se
 * calculan contra el reloj real (siempre hay un lunes entre 7 y 13 días adelante), nunca se
 * hardcodea una fecha que con el tiempo quede en el pasado.
 */
abstract class CascadaITBase extends IntegrationTestBase {

    protected static final String CLAVE = "Admin1234!";
    protected static final ZoneId AR = ZoneId.of("America/Argentina/Buenos_Aires");

    @Autowired
    protected UsuarioRepository usuarioRepository;

    @Autowired
    protected PasswordEncoder passwordEncoder;

    @Autowired
    protected JdbcTemplate jdbcTemplate;

    protected Long adminUsuarioId;
    protected String tokenAdmin;
    protected Long profesionalId;
    protected Long profesionalUsuarioId;
    protected String tokenProfesional;
    protected String tokenOtroProfesional;
    protected String tokenSocio;
    protected Long anaPersonaId;
    protected Long anaUsuarioId;
    protected String anaEmail;
    protected Long betoPersonaId;
    protected Long betoUsuarioId;
    protected Long franjaLunesId;
    protected Long franjaMiercolesId;

    /** Lunes: 10:00 y 11:00 de Ana, 12:00 de Beto. Miércoles 10:00 de Beto. Y un lunes pasado de Ana. */
    protected Long turnoLunes10;
    protected Long turnoLunes11;
    protected Long turnoLunes12;
    protected Long turnoMiercoles10;
    protected Long turnoPasado;

    protected LocalDate lunes;

    @BeforeEach
    void sembrarEscenario() {
        String emailAdmin = "admin-" + UUID.randomUUID() + "@vitalys.test";
        adminUsuarioId = usuarioRepository
                .save(new Usuario(emailAdmin, passwordEncoder.encode(CLAVE), RolUsuario.ADMIN))
                .getId();
        tokenAdmin = login(emailAdmin);

        String emailProf = "prof-" + UUID.randomUUID() + "@vitalys.test";
        profesionalUsuarioId = usuarioRepository
                .save(new Usuario(emailProf, passwordEncoder.encode(CLAVE), RolUsuario.PROFESIONAL))
                .getId();
        tokenProfesional = login(emailProf);
        profesionalId = jdbcTemplate.queryForObject(
                "INSERT INTO profesionales (usuario_id, nombre, apellido, especialidad, duracion_turno_minutos) "
                        + "VALUES (?, 'Valentina', 'Méndez', 'NUTRICION'::especialidad, 30) RETURNING id",
                Long.class,
                profesionalUsuarioId);
        franjaLunesId = franja(1, "09:00", "13:00");
        franjaMiercolesId = franja(3, "09:00", "13:00");

        String emailOtro = "otro-" + UUID.randomUUID() + "@vitalys.test";
        Usuario otro = usuarioRepository.save(new Usuario(emailOtro, passwordEncoder.encode(CLAVE), RolUsuario.PROFESIONAL));
        jdbcTemplate.update(
                "INSERT INTO profesionales (usuario_id, nombre, apellido, especialidad, duracion_turno_minutos) "
                        + "VALUES (?, 'Rodrigo', 'Almirón', 'PSICOLOGIA'::especialidad, 50)",
                otro.getId());
        tokenOtroProfesional = login(emailOtro);

        String emailSocio = "socio-" + UUID.randomUUID() + "@vitalys.test";
        usuarioRepository.save(new Usuario(emailSocio, passwordEncoder.encode(CLAVE), RolUsuario.SOCIO_PACIENTE));
        tokenSocio = login(emailSocio);

        anaEmail = "ana-" + UUID.randomUUID() + "@vitalys.test";
        anaUsuarioId = usuarioRepository
                .save(new Usuario(anaEmail, passwordEncoder.encode(CLAVE), RolUsuario.SOCIO_PACIENTE))
                .getId();
        anaPersonaId = persona(anaUsuarioId, "Ana", "Gómez");
        betoUsuarioId = usuarioRepository
                .save(new Usuario("beto-" + UUID.randomUUID() + "@vitalys.test", passwordEncoder.encode(CLAVE), RolUsuario.SOCIO_PACIENTE))
                .getId();
        betoPersonaId = persona(betoUsuarioId, "Beto", "Pérez");

        LocalDate hoy = LocalDate.now(AR);
        lunes = hoy.plusDays(7).with(TemporalAdjusters.nextOrSame(DayOfWeek.MONDAY));
        LocalDate miercoles = lunes.plusDays(2);
        LocalDate lunesPasado = hoy.minusDays(7).with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        turnoLunes10 = turno(anaPersonaId, anaUsuarioId, lunes, "10:00");
        turnoLunes11 = turno(anaPersonaId, anaUsuarioId, lunes, "11:00");
        turnoLunes12 = turno(betoPersonaId, betoUsuarioId, lunes, "12:00");
        turnoMiercoles10 = turno(betoPersonaId, betoUsuarioId, miercoles, "10:00");
        turnoPasado = turno(anaPersonaId, anaUsuarioId, lunesPasado, "10:00");
    }

    protected Long franja(int dia, String desde, String hasta) {
        return jdbcTemplate.queryForObject(
                "INSERT INTO disponibilidad_profesional (profesional_id, dia_semana, hora_inicio, hora_fin) "
                        + "VALUES (?, ?, ?::time, ?::time) RETURNING id",
                Long.class,
                profesionalId,
                dia,
                desde,
                hasta);
    }

    protected Long persona(Long usuarioId, String nombre, String apellido) {
        return jdbcTemplate.queryForObject(
                "INSERT INTO personas (usuario_id, nombre, apellido, dni) VALUES (?, ?, ?, ?) RETURNING id",
                Long.class,
                usuarioId,
                nombre,
                apellido,
                UUID.randomUUID().toString().substring(0, 18));
    }

    /** Turno de consultorio de 30 minutos, RESERVADO, a la hora de pared argentina indicada. */
    protected Long turno(Long personaId, Long usuarioId, LocalDate dia, String hora) {
        OffsetDateTime inicio = dia.atTime(LocalTime.parse(hora)).atZone(AR).toOffsetDateTime();
        return jdbcTemplate.queryForObject(
                "INSERT INTO turnos (persona_id, profesional_id, tipo_turno, reservado_por_usuario_id, inicio, fin) "
                        + "VALUES (?, ?, 'CONSULTORIO', ?, ?, ?) RETURNING id",
                Long.class,
                personaId,
                profesionalId,
                usuarioId,
                inicio,
                inicio.plusMinutes(30));
    }

    protected String estadoDe(Long turnoId) {
        return jdbcTemplate.queryForObject("SELECT estado::text FROM turnos WHERE id = ?", String.class, turnoId);
    }

    protected int cantidadDeFranjas() {
        return jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM disponibilidad_profesional WHERE profesional_id = ?", Integer.class, profesionalId);
    }

    protected int avisosDeCancelacion() {
        return jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM notificaciones n JOIN turnos t ON t.id = n.turno_id "
                        + "WHERE n.tipo = 'AVISO_CANCELACION' AND t.profesional_id = ?",
                Integer.class,
                profesionalId);
    }

    protected String login(String email) {
        Map<String, Object> body = Map.of("identificador", email, "contrasena", CLAVE);
        return restTemplate
                .postForEntity(urlBase() + "/api/auth/login", body, LoginResponse.class)
                .getBody()
                .getToken();
    }

    protected <T> ResponseEntity<T> llamar(HttpMethod metodo, String ruta, Object body, String token, Class<T> tipo) {
        HttpHeaders headers = new HttpHeaders();
        if (token != null) {
            headers.setBearerAuth(token);
        }
        return restTemplate.exchange(urlBase() + ruta, metodo, new HttpEntity<>(body, headers), tipo);
    }

    protected static Map<String, Object> franjaBody(int dia, String desde, String hasta) {
        return Map.of("diaSemana", dia, "horaInicio", desde, "horaFin", hasta);
    }

    protected String rutaDisponibilidad() {
        return "/api/profesionales/" + profesionalId + "/disponibilidad";
    }
}
