package com.vitalys.integration;

import static org.assertj.core.api.Assertions.assertThat;

import com.vitalys.domain.RolUsuario;
import com.vitalys.domain.Usuario;
import com.vitalys.dto.LoginResponse;
import com.vitalys.dto.PersonaResponse;
import com.vitalys.dto.ProfesionalResponse;
import com.vitalys.dto.SlotConsultorioResponse;
import com.vitalys.dto.TurnoResponse;
import com.vitalys.repository.UsuarioRepository;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * Reserva de consultorio contra Postgres real: slots según disponibilidad y duración, PI-07,
 * PI-08 (EXCLUDE GIST), TU-07 y TU-09 de punta a punta, y la agenda del profesional.
 */
class TurnoConsultorioIT extends IntegrationTestBase {

    private static final ZoneId ZONA = ZoneId.of("America/Argentina/Buenos_Aires");
    private static final String CLAVE = "Admin1234!";

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private String tokenAdmin;
    private ProfesionalResponse profesional;
    private String tokenProfesional;
    private LocalDate dia;

    @BeforeEach
    void escenario() {
        String emailAdmin = "admin-c-" + UUID.randomUUID() + "@vitalys.test";
        usuarioRepository.save(new Usuario(emailAdmin, passwordEncoder.encode(CLAVE), RolUsuario.ADMIN));
        tokenAdmin = login(emailAdmin);

        String emailProfesional = "nutri-" + UUID.randomUUID() + "@vitalys.test";
        Map<String, Object> datos = Map.of(
                "nombre", "Valentina", "apellido", "Méndez", "especialidad", "NUTRICION", "duracionTurnoMinutos", 30);
        profesional = llamar(
                        HttpMethod.POST,
                        "/api/profesionales",
                        Map.of("email", emailProfesional, "contrasena", CLAVE, "datos", datos),
                        tokenAdmin,
                        ProfesionalResponse.class)
                .getBody();
        tokenProfesional = login(emailProfesional);

        dia = LocalDate.now(ZONA).plusWeeks(2).with(DayOfWeek.WEDNESDAY);
        jdbcTemplate.update(
                "INSERT INTO disponibilidad_profesional (profesional_id, dia_semana, hora_inicio, hora_fin) "
                        + "VALUES (?, 3, '09:00', '11:00')",
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

    private Socio socio(boolean suspendido) {
        String email = "pac-" + UUID.randomUUID() + "@mail.test";
        Map<String, Object> datos = new LinkedHashMap<>();
        datos.put("nombre", "Paciente");
        datos.put("apellido", "Prueba");
        datos.put("dni", String.valueOf(ThreadLocalRandom.current().nextInt(10_000_000, 99_999_999)));
        datos.put("esSocioGym", true);
        LocalDate inicio = LocalDate.now(ZONA).withDayOfMonth(1);
        datos.put("fechaInicioMembresia", (suspendido ? inicio.minusMonths(9) : inicio).toString());
        PersonaResponse persona = llamar(
                        HttpMethod.POST, "/api/personas", Map.of("email", email, "contrasena", CLAVE, "datos", datos), tokenAdmin,
                        PersonaResponse.class)
                .getBody();
        return new Socio(persona, login(email));
    }

    private OffsetDateTime hora(int h, int m) {
        return dia.atTime(h, m).atZone(ZONA).toOffsetDateTime();
    }

    private ResponseEntity<String> reservar(String token, OffsetDateTime inicio) {
        Map<String, Object> body = Map.of("profesionalId", profesional.id(), "inicio", inicio.toString());
        return llamar(HttpMethod.POST, "/api/turnos", body, token, String.class);
    }

    private SlotConsultorioResponse[] slots() {
        return llamar(
                        HttpMethod.GET,
                        "/api/turnos/disponibles?profesionalId=" + profesional.id() + "&fecha=" + dia,
                        null,
                        tokenAdmin,
                        SlotConsultorioResponse[].class)
                .getBody();
    }

    @Test
    void pi07_reservaEnUnSlotLibre_yElSlotQuedaTomado() {
        assertThat(slots()).hasSize(4).allMatch(SlotConsultorioResponse::libre);
        Socio s = socio(false);

        ResponseEntity<TurnoResponse> r = llamar(
                HttpMethod.POST,
                "/api/turnos",
                Map.of("profesionalId", profesional.id(), "inicio", hora(9, 30).toString()),
                s.token(),
                TurnoResponse.class);

        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(r.getBody().tipoTurno().name()).isEqualTo("CONSULTORIO");
        assertThat(r.getBody().fin().toInstant()).isEqualTo(hora(10, 0).toInstant());
        assertThat(slots()).extracting(SlotConsultorioResponse::libre).containsExactly(true, false, true, true);
    }

    @Test
    void pi08_mismoSlotParaOtroPaciente_da409() {
        reservar(socio(false).token(), hora(10, 0));

        ResponseEntity<String> r = reservar(socio(false).token(), hora(10, 0));

        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(r.getBody()).contains("profesional ya tiene");
    }

    @Test
    void tu07_fueraDeLaDisponibilidad_da422() {
        Socio s = socio(false);
        assertThat(reservar(s.token(), hora(9, 15)).getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
        assertThat(reservar(s.token(), hora(15, 0)).getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
    }

    @Test
    void tu09_socioSuspendidoEnGimnasioReservaConsultorio() {
        assertThat(reservar(socio(true).token(), hora(10, 30)).getStatusCode()).isEqualTo(HttpStatus.CREATED);
    }

    @Test
    void cancelarAntesDelInicioLiberaElSlot_yLaAgendaDelProfesionalLoMuestra() {
        Socio s = socio(false);
        TurnoResponse t = llamar(
                        HttpMethod.POST,
                        "/api/turnos",
                        Map.of("profesionalId", profesional.id(), "inicio", hora(9, 0).toString()),
                        s.token(),
                        TurnoResponse.class)
                .getBody();

        TurnoResponse[] agenda = llamar(
                        HttpMethod.GET, "/api/turnos/mi-agenda?desde=" + dia + "&hasta=" + dia, null, tokenProfesional,
                        TurnoResponse[].class)
                .getBody();
        assertThat(agenda).extracting(TurnoResponse::id).containsExactly(t.id());

        llamar(HttpMethod.PATCH, "/api/turnos/" + t.id() + "/cancelar", Map.of("motivo", "No puedo"), s.token(), String.class);
        assertThat(slots()[0].libre()).isTrue();
        assertThat(reservar(socio(false).token(), hora(9, 0)).getStatusCode()).isEqualTo(HttpStatus.CREATED);
    }

    @Test
    void elProfesionalNoReservaYElSocioNoVeAgenda() {
        assertThat(reservar(tokenProfesional, hora(9, 0)).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(llamar(HttpMethod.GET, "/api/turnos/mi-agenda", null, socio(false).token(), String.class).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
    }
}
