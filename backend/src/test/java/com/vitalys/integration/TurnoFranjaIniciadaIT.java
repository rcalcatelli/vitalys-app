package com.vitalys.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.vitalys.domain.RolUsuario;
import com.vitalys.domain.Usuario;
import com.vitalys.dto.LoginResponse;
import com.vitalys.dto.PersonaResponse;
import com.vitalys.dto.ProfesionalResponse;
import com.vitalys.dto.TurnoResponse;
import com.vitalys.repository.UsuarioRepository;
import java.sql.Timestamp;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * PI-13 y PI-15: una cancelación registrada con la franja ya iniciada no libera el lugar (RN-02,
 * RN-03). La API no deja reservar un horario que ya empezó, así que el turno iniciado y el
 * competidor se insertan directo en la base; la cancelación sí pasa por la API, que es lo que
 * fija {@code cancelado_en}. Lo que se prueba es que el motor sigue contando ese lugar como ocupado.
 */
class TurnoFranjaIniciadaIT extends IntegrationTestBase {

    private static final ZoneId ZONA = ZoneId.of("America/Argentina/Buenos_Aires");
    private static final String CLAVE = "Admin1234!";

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private String tokenAdmin;

    @BeforeEach
    void crearAdmin() {
        String email = "admin-fi-" + UUID.randomUUID() + "@vitalys.test";
        usuarioRepository.save(new Usuario(email, passwordEncoder.encode(CLAVE), RolUsuario.ADMIN));
        tokenAdmin = login(email);
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
        String email = "fi-" + UUID.randomUUID() + "@mail.test";
        Map<String, Object> datos = new LinkedHashMap<>();
        datos.put("nombre", "Socio");
        datos.put("apellido", "Franja");
        datos.put("dni", String.valueOf(ThreadLocalRandom.current().nextInt(10_000_000, 99_999_999)));
        datos.put("esSocioGym", true);
        datos.put("fechaInicioMembresia", LocalDate.now(ZONA).withDayOfMonth(1).toString());
        PersonaResponse persona = llamar(
                        HttpMethod.POST, "/api/personas", Map.of("email", email, "contrasena", CLAVE, "datos", datos), tokenAdmin,
                        PersonaResponse.class)
                .getBody();
        return new Socio(persona, login(email));
    }

    private Long insertarTurno(Socio s, Long profesionalId, String tipo, OffsetDateTime inicio, OffsetDateTime fin) {
        return jdbcTemplate.queryForObject(
                "INSERT INTO turnos (persona_id, profesional_id, tipo_turno, inicio, fin, estado, reservado_por_usuario_id) "
                        + "VALUES (?, ?, ?::tipo_turno, ?, ?, 'RESERVADO', ?) RETURNING id",
                Long.class,
                s.persona().id(),
                profesionalId,
                tipo,
                Timestamp.from(inicio.toInstant()),
                Timestamp.from(fin.toInstant()),
                s.persona().usuarioId());
    }

    private TurnoResponse cancelar(Socio s, Long turnoId) {
        ResponseEntity<TurnoResponse> r = llamar(
                HttpMethod.PATCH, "/api/turnos/" + turnoId + "/cancelar", Map.of("motivo", "Llegué tarde"), s.token(), TurnoResponse.class);
        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.OK);
        return r.getBody();
    }

    @Test
    void pi13_cancelarConLaFranjaIniciadaNoLiberaElHorarioDelProfesional() {
        Map<String, Object> datos = Map.of(
                "nombre", "Rodrigo", "apellido", "Almirón", "especialidad", "PSICOLOGIA", "duracionTurnoMinutos", 50);
        ProfesionalResponse profesional = llamar(
                        HttpMethod.POST,
                        "/api/profesionales",
                        Map.of("email", "psi-" + UUID.randomUUID() + "@vitalys.test", "contrasena", CLAVE, "datos", datos),
                        tokenAdmin,
                        ProfesionalResponse.class)
                .getBody();
        OffsetDateTime inicio = OffsetDateTime.now(ZONA).truncatedTo(ChronoUnit.MINUTES).minusMinutes(20);
        OffsetDateTime fin = inicio.plusMinutes(50);
        Socio titular = socio();
        Long turno = insertarTurno(titular, profesional.id(), "CONSULTORIO", inicio, fin);

        TurnoResponse cancelado = cancelar(titular, turno);

        assertThat(cancelado.estado().name()).isEqualTo("CANCELADO_TARDE");
        assertThat(cancelado.canceladoEn()).isAfterOrEqualTo(inicio);
        Socio otro = socio();
        assertThatThrownBy(() -> insertarTurno(otro, profesional.id(), "CONSULTORIO", inicio, fin))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessageContaining("excl_turnos_overlap");
    }

    /** Un día hábil de la semana pasada, que no sea feriado, a las 10:00: una franja válida ya iniciada. */
    private OffsetDateTime franjaGymPasada() {
        LocalDate d = LocalDate.now(ZONA).minusDays(7);
        while (d.getDayOfWeek() == DayOfWeek.SATURDAY
                || d.getDayOfWeek() == DayOfWeek.SUNDAY
                || jdbcTemplate.queryForObject("SELECT COUNT(*) FROM feriados WHERE fecha = ?", Integer.class, d) > 0) {
            d = d.minusDays(1);
        }
        return d.atTime(10, 0).atZone(ZONA).toOffsetDateTime();
    }

    @Test
    void pi15_cancelarConLaFranjaIniciadaSigueOcupandoElCupoDelGimnasio() {
        OffsetDateTime inicio = franjaGymPasada();
        Socio titular = socio();
        Long turno = insertarTurno(titular, null, "GYM", inicio, inicio.plusHours(1));
        TurnoResponse cancelado = cancelar(titular, turno);
        assertThat(cancelado.estado().name()).isEqualTo("CANCELADO_TARDE");

        Integer libresAntes = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM turnos WHERE tipo_turno = 'GYM' AND inicio = ? "
                        + "AND fn_turno_ocupa_lugar(estado, inicio, cancelado_en)",
                Integer.class,
                Timestamp.from(inicio.toInstant()));
        Socio otro = socio();
        jdbcTemplate.update("UPDATE configuracion_gym SET cupo_por_franja = ? WHERE id = 1", libresAntes);
        try {
            assertThatThrownBy(() -> insertarTurno(otro, null, "GYM", inicio, inicio.plusHours(1)))
                    .isInstanceOf(DataIntegrityViolationException.class)
                    .hasMessageContaining("Cupo completo");
        } finally {
            jdbcTemplate.update("UPDATE configuracion_gym SET cupo_por_franja = 20 WHERE id = 1");
        }
    }
}
