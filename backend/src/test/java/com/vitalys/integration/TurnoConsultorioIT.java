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
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.ThreadLocalRandom;
import java.util.concurrent.TimeUnit;
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
    void elDniDelPacienteSoloSeExponeEnLaAgendaDelProfesional() {
        Socio s = socio(false);
        String dni = s.persona().dni();
        TurnoResponse t = llamar(
                        HttpMethod.POST,
                        "/api/turnos",
                        Map.of("profesionalId", profesional.id(), "inicio", hora(9, 0).toString()),
                        s.token(),
                        TurnoResponse.class)
                .getBody();

        String agenda = llamar(
                        HttpMethod.GET, "/api/turnos/mi-agenda?desde=" + dia + "&hasta=" + dia, null, tokenProfesional, String.class)
                .getBody();
        assertThat(agenda).contains("\"pacienteDni\":\"" + dni + "\"");

        List<String> otras = List.of(
                llamar(HttpMethod.GET, "/api/turnos/mis-turnos", null, s.token(), String.class).getBody(),
                llamar(HttpMethod.GET, "/api/turnos/" + t.id(), null, s.token(), String.class).getBody(),
                llamar(HttpMethod.GET, "/api/turnos/" + t.id(), null, tokenAdmin, String.class).getBody(),
                llamar(HttpMethod.GET, "/api/turnos?tipo=CONSULTORIO&personaId=" + s.persona().id(), null, tokenAdmin, String.class)
                        .getBody(),
                llamar(
                                HttpMethod.GET,
                                "/api/turnos/disponibles?profesionalId=" + profesional.id() + "&fecha=" + dia,
                                null,
                                s.token(),
                                String.class)
                        .getBody());
        assertThat(otras).allSatisfy(cuerpo -> assertThat(cuerpo).doesNotContain(dni).doesNotContainIgnoringCase("dni"));
    }

    /** PI-09: dos personas piden el mismo slot a la vez; la base decide, nunca dos 201. */
    @Test
    void pi09_dosReservasSimultaneasDelMismoSlot_unaGanaYLaOtraDa409() throws Exception {
        for (OffsetDateTime slot : List.of(hora(9, 0), hora(9, 30), hora(10, 0))) {
            String tokenA = socio(false).token();
            String tokenB = socio(false).token();
            ExecutorService pool = Executors.newFixedThreadPool(2);
            CountDownLatch listos = new CountDownLatch(2);
            CountDownLatch largada = new CountDownLatch(1);
            try {
                List<Future<Integer>> resultados = new ArrayList<>();
                for (String token : List.of(tokenA, tokenB)) {
                    resultados.add(pool.submit(() -> {
                        listos.countDown();
                        largada.await();
                        return reservar(token, slot).getStatusCode().value();
                    }));
                }
                assertThat(listos.await(10, TimeUnit.SECONDS)).isTrue();
                largada.countDown();
                List<Integer> estados = new ArrayList<>();
                for (Future<Integer> f : resultados) {
                    estados.add(f.get(30, TimeUnit.SECONDS));
                }
                assertThat(estados).as("slot %s", slot).containsExactlyInAnyOrder(201, 409);
            } finally {
                pool.shutdownNow();
            }
        }
    }

    /** PI-12: cancelar con menos de 24 h es tardía, pero antes del inicio el lugar se libera. */
    @Test
    void pi12_cancelacionTardiaAntesDelInicio_quedaCanceladoTardeYElSlotSeReserva() {
        String email = "nutri-tarde-" + UUID.randomUUID() + "@vitalys.test";
        Map<String, Object> datos = Map.of(
                "nombre", "Lucía", "apellido", "Paz", "especialidad", "NUTRICION", "duracionTurnoMinutos", 30);
        ProfesionalResponse otro = llamar(
                        HttpMethod.POST,
                        "/api/profesionales",
                        Map.of("email", email, "contrasena", CLAVE, "datos", datos),
                        tokenAdmin,
                        ProfesionalResponse.class)
                .getBody();
        for (int diaSemana = 1; diaSemana <= 7; diaSemana++) {
            jdbcTemplate.update(
                    "INSERT INTO disponibilidad_profesional (profesional_id, dia_semana, hora_inicio, hora_fin) "
                            + "VALUES (?, ?, '00:00', '23:59')",
                    otro.id(),
                    diaSemana);
        }
        OffsetDateTime slot = proximaMediaHora(OffsetDateTime.now(ZONA).plusHours(2));
        if (slot.getHour() == 23 && slot.getMinute() == 30) {
            slot = slot.plusMinutes(30); // el último turno debe terminar antes de las 23:59
        }
        Map<String, Object> pedido = Map.of("profesionalId", otro.id(), "inicio", slot.toString());

        Socio primero = socio(false);
        TurnoResponse t = llamar(HttpMethod.POST, "/api/turnos", pedido, primero.token(), TurnoResponse.class).getBody();

        ResponseEntity<TurnoResponse> cancelado = llamar(
                HttpMethod.PATCH, "/api/turnos/" + t.id() + "/cancelar", Map.of("motivo", "Me surgió algo"), primero.token(),
                TurnoResponse.class);
        assertThat(cancelado.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(cancelado.getBody().estado().name()).isEqualTo("CANCELADO_TARDE");

        ResponseEntity<TurnoResponse> otraPersona =
                llamar(HttpMethod.POST, "/api/turnos", pedido, socio(false).token(), TurnoResponse.class);
        assertThat(otraPersona.getStatusCode()).isEqualTo(HttpStatus.CREATED);
    }

    /** Primer múltiplo de 30 minutos que no es anterior a {@code desde}. */
    private static OffsetDateTime proximaMediaHora(OffsetDateTime desde) {
        OffsetDateTime base = desde.truncatedTo(ChronoUnit.MINUTES);
        int resto = base.getMinute() % 30;
        boolean exacto = resto == 0 && desde.equals(base);
        return exacto ? base : base.plusMinutes(30 - resto);
    }

    @Test
    void elProfesionalNoReservaYElSocioNoVeAgenda() {
        assertThat(reservar(tokenProfesional, hora(9, 0)).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(llamar(HttpMethod.GET, "/api/turnos/mi-agenda", null, socio(false).token(), String.class).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
    }
}
