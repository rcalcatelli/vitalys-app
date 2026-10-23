package com.vitalys.integration;

import static org.assertj.core.api.Assertions.assertThat;

import com.vitalys.domain.RolUsuario;
import com.vitalys.domain.Usuario;
import com.vitalys.dto.LoginResponse;
import com.vitalys.dto.PersonaResponse;
import com.vitalys.dto.ProfesionalResponse;
import com.vitalys.dto.TurnoResponse;
import com.vitalys.repository.UsuarioRepository;
import com.vitalys.service.notificaciones.AvisosTurnoService;
import java.sql.Timestamp;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * RF-26 a RF-28 contra Postgres real: reservar registra la confirmación, cancelar el aviso, y el
 * recordatorio sale una sola vez por turno aunque el job corra de nuevo. En tests el proveedor es
 * el notificador que solo loguea, así que lo que se verifica son las filas de {@code notificaciones}.
 */
class AvisosTurnoIT extends IntegrationTestBase {

    private static final ZoneId ZONA = ZoneId.of("America/Argentina/Buenos_Aires");
    private static final String CLAVE = "Admin1234!";

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private AvisosTurnoService avisos;

    private String tokenAdmin;
    private ProfesionalResponse profesional;

    @BeforeEach
    void escenario() {
        String emailAdmin = "admin-av-" + UUID.randomUUID() + "@vitalys.test";
        usuarioRepository.save(new Usuario(emailAdmin, passwordEncoder.encode(CLAVE), RolUsuario.ADMIN));
        tokenAdmin = login(emailAdmin);
        Map<String, Object> datos = Map.of(
                "nombre", "Valentina", "apellido", "Méndez", "especialidad", "NUTRICION", "duracionTurnoMinutos", 30);
        profesional = llamar(
                        HttpMethod.POST,
                        "/api/profesionales",
                        Map.of("email", "nutri-av-" + UUID.randomUUID() + "@vitalys.test", "contrasena", CLAVE, "datos", datos),
                        tokenAdmin,
                        ProfesionalResponse.class)
                .getBody();
        jdbcTemplate.update(
                "INSERT INTO disponibilidad_profesional (profesional_id, dia_semana, hora_inicio, hora_fin) VALUES (?, 3, '09:00', '11:00')",
                profesional.id());
    }

    private String login(String email) {
        return restTemplate
                .postForEntity(urlBase() + "/api/auth/login", Map.of("identificador", email, "contrasena", CLAVE), LoginResponse.class)
                .getBody()
                .getToken();
    }

    private <T> ResponseEntity<T> llamar(HttpMethod metodo, String ruta, Object body, String token, Class<T> tipo) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        return restTemplate.exchange(urlBase() + ruta, metodo, new HttpEntity<>(body, headers), tipo);
    }

    private record Socio(PersonaResponse persona, String token) {}

    private Socio socio() {
        String email = "av-" + UUID.randomUUID() + "@mail.test";
        Map<String, Object> datos = new LinkedHashMap<>();
        datos.put("nombre", "Paciente");
        datos.put("apellido", "Avisos");
        datos.put("dni", String.valueOf(ThreadLocalRandom.current().nextInt(10_000_000, 99_999_999)));
        datos.put("esSocioGym", false);
        PersonaResponse persona = llamar(
                        HttpMethod.POST, "/api/personas", Map.of("email", email, "contrasena", CLAVE, "datos", datos), tokenAdmin,
                        PersonaResponse.class)
                .getBody();
        return new Socio(persona, login(email));
    }

    private List<String> tiposDe(Long turnoId) {
        return jdbcTemplate.queryForList(
                "SELECT tipo::text FROM notificaciones WHERE turno_id = ? ORDER BY id", String.class, turnoId);
    }

    @Test
    void reservarConfirmaYCancelarAvisa() {
        Socio s = socio();
        OffsetDateTime inicio = LocalDate.now(ZONA).plusWeeks(2).with(DayOfWeek.WEDNESDAY).atTime(9, 0).atZone(ZONA).toOffsetDateTime();
        TurnoResponse t = llamar(
                        HttpMethod.POST,
                        "/api/turnos",
                        Map.of("profesionalId", profesional.id(), "inicio", inicio.toString()),
                        s.token(),
                        TurnoResponse.class)
                .getBody();

        assertThat(tiposDe(t.id())).containsExactly("CONFIRMACION_TURNO");
        String destino = jdbcTemplate.queryForObject(
                "SELECT email_destino FROM notificaciones WHERE turno_id = ?", String.class, t.id());
        assertThat(destino).startsWith("av-");

        llamar(HttpMethod.PATCH, "/api/turnos/" + t.id() + "/cancelar", Map.of("motivo", "No puedo"), s.token(), String.class);

        assertThat(tiposDe(t.id())).containsExactly("CONFIRMACION_TURNO", "AVISO_CANCELACION");
    }

    @Test
    void recordatorio_unaSolaVezYSoloSiSeReservoConAnticipacion() {
        OffsetDateTime inicio = OffsetDateTime.now(ZONA).truncatedTo(ChronoUnit.MINUTES).plusHours(20);
        Long conAnticipacion = insertarTurno(socio(), inicio, OffsetDateTime.now(ZONA).minusDays(3));
        Long reservadoRecien = insertarTurno(socio(), inicio.plusMinutes(30), OffsetDateTime.now(ZONA));
        Long lejano = insertarTurno(socio(), inicio.plusDays(3), OffsetDateTime.now(ZONA).minusDays(3));

        avisos.enviarRecordatorios();
        avisos.enviarRecordatorios();

        assertThat(tiposDe(conAnticipacion)).containsExactly("RECORDATORIO");
        assertThat(tiposDe(reservadoRecien)).isEmpty();
        assertThat(tiposDe(lejano)).isEmpty();
    }

    /** La API no deja fijar la fecha de reserva: el turno se inserta con su {@code creado_en}. */
    private Long insertarTurno(Socio s, OffsetDateTime inicio, OffsetDateTime creadoEn) {
        return jdbcTemplate.queryForObject(
                "INSERT INTO turnos (persona_id, profesional_id, tipo_turno, inicio, fin, estado, reservado_por_usuario_id, creado_en) "
                        + "VALUES (?, ?, 'CONSULTORIO', ?, ?, 'RESERVADO', ?, ?) RETURNING id",
                Long.class,
                s.persona().id(),
                profesional.id(),
                Timestamp.from(inicio.toInstant()),
                Timestamp.from(inicio.plusMinutes(30).toInstant()),
                s.persona().usuarioId(),
                Timestamp.from(creadoEn.toInstant()));
    }
}
