package com.vitalys.integration;

import static org.assertj.core.api.Assertions.assertThat;

import com.vitalys.domain.RolUsuario;
import com.vitalys.domain.Usuario;
import com.vitalys.dto.EstadoGymResponse;
import com.vitalys.dto.ExcepcionMorosidadResponse;
import com.vitalys.dto.FranjaGymResponse;
import com.vitalys.dto.LoginResponse;
import com.vitalys.dto.PersonaResponse;
import com.vitalys.dto.TurnoResponse;
import com.vitalys.repository.UsuarioRepository;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.Arrays;
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
 * Turnos de gimnasio de punta a punta contra Postgres real: reserva, morosidad con y sin
 * excepción, cancelación y cupo, y los rechazos del motor traducidos a 409/422.
 */
class TurnoGymIT extends IntegrationTestBase {

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
        String email = "admin-t-" + UUID.randomUUID() + "@vitalys.test";
        usuarioRepository.save(new Usuario(email, passwordEncoder.encode(CLAVE), RolUsuario.ADMIN));
        tokenAdmin = login(email);
    }

    // ------------------------------------------------------------------ auxiliares

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

    /** Un día hábil de acá a {@code semanas} semanas que no sea feriado. */
    private LocalDate diaHabil(int semanas) {
        LocalDate d = LocalDate.now(ZONA).plusWeeks(semanas);
        while (d.getDayOfWeek() == DayOfWeek.SATURDAY
                || d.getDayOfWeek() == DayOfWeek.SUNDAY
                || jdbcTemplate.queryForObject("SELECT COUNT(*) FROM feriados WHERE fecha = ?", Integer.class, d) > 0) {
            d = d.plusDays(1);
        }
        return d;
    }

    private static OffsetDateTime franja(LocalDate dia, int hora, int minuto) {
        return dia.atTime(hora, minuto).atZone(ZONA).toOffsetDateTime();
    }

    private record Socio(PersonaResponse persona, String token) {}

    /** Alta presencial de un socio del gimnasio con la membresía iniciada en {@code inicioMembresia}. */
    private Socio socio(LocalDate inicioMembresia) {
        String email = "socio-" + UUID.randomUUID() + "@mail.test";
        Map<String, Object> datos = new LinkedHashMap<>();
        datos.put("nombre", "Socio");
        datos.put("apellido", "Prueba");
        datos.put("dni", String.valueOf(ThreadLocalRandom.current().nextInt(10_000_000, 99_999_999)));
        datos.put("esSocioGym", true);
        datos.put("fechaInicioMembresia", inicioMembresia.toString());
        Map<String, Object> body = Map.of("email", email, "contrasena", CLAVE, "datos", datos);
        PersonaResponse persona = llamar(HttpMethod.POST, "/api/personas", body, tokenAdmin, PersonaResponse.class).getBody();
        return new Socio(persona, login(email));
    }

    private Socio socioAlDia() {
        return socio(LocalDate.now(ZONA).withDayOfMonth(1));
    }

    private Socio socioSuspendido() {
        return socio(LocalDate.now(ZONA).withDayOfMonth(1).minusMonths(9));
    }

    private ResponseEntity<String> reservar(String token, OffsetDateTime inicio) {
        return llamar(HttpMethod.POST, "/api/turnos/gym", Map.of("inicio", inicio.toString()), token, String.class);
    }

    private TurnoResponse reservarOk(String token, OffsetDateTime inicio) {
        ResponseEntity<TurnoResponse> r =
                llamar(HttpMethod.POST, "/api/turnos/gym", Map.of("inicio", inicio.toString()), token, TurnoResponse.class);
        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        return r.getBody();
    }

    private int ocupados(LocalDate dia, int hora) {
        FranjaGymResponse[] franjas =
                llamar(HttpMethod.GET, "/api/turnos/gym/cupo?fecha=" + dia, null, tokenAdmin, FranjaGymResponse[].class).getBody();
        return Arrays.stream(franjas)
                .filter(f -> f.inicio().atZoneSameInstant(ZONA).getHour() == hora)
                .findFirst()
                .orElseThrow()
                .ocupados();
    }

    // ------------------------------------------------------------------ casos

    @Test
    void pi07_socioAlDiaReservaYLoVeEnSusTurnos() {
        Socio s = socioAlDia();
        TurnoResponse t = reservarOk(s.token(), franja(diaHabil(2), 10, 0));

        assertThat(t.estado().name()).isEqualTo("RESERVADO");
        assertThat(t.profesionalId()).isNull();
        assertThat(t.personaId()).isEqualTo(s.persona().id());
        TurnoResponse[] mios = llamar(HttpMethod.GET, "/api/turnos/mis-turnos", null, s.token(), TurnoResponse[].class).getBody();
        assertThat(mios).extracting(TurnoResponse::id).containsExactly(t.id());
    }

    @Test
    void pi10_pi51_pi52_suspendidoNecesitaExcepcionYLaDeUnSoloUsoSeAgota() {
        Socio s = socioSuspendido();
        LocalDate dia = diaHabil(2);

        ResponseEntity<String> rechazo = reservar(s.token(), franja(dia, 11, 0));
        assertThat(rechazo.getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
        assertThat(rechazo.getBody()).contains("morosidad");

        Map<String, Object> exc = Map.of(
                "personaId", s.persona().id(),
                "motivo", "Plan de pago acordado",
                "validaHasta", LocalDate.now(ZONA).plusMonths(1).toString(),
                "unSoloUso", true);
        ResponseEntity<ExcepcionMorosidadResponse> alta =
                llamar(HttpMethod.POST, "/api/excepciones-morosidad", exc, tokenAdmin, ExcepcionMorosidadResponse.class);
        assertThat(alta.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(alta.getBody().turnoId()).isNull();

        TurnoResponse t = reservarOk(s.token(), franja(dia, 11, 0));
        ExcepcionMorosidadResponse[] historial = llamar(
                        HttpMethod.GET, "/api/excepciones-morosidad/persona/" + s.persona().id(), null, tokenAdmin,
                        ExcepcionMorosidadResponse[].class)
                .getBody();
        assertThat(historial).singleElement().extracting(ExcepcionMorosidadResponse::turnoId).isEqualTo(t.id());

        assertThat(reservar(s.token(), franja(diaHabil(3), 11, 0)).getStatusCode())
                .isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
    }

    @Test
    void pi85_unTurnoDeGimnasioPorDia_segundoDa409() {
        Socio s = socioAlDia();
        LocalDate dia = diaHabil(2);
        reservarOk(s.token(), franja(dia, 8, 0));

        assertThat(reservar(s.token(), franja(dia, 18, 0)).getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    void pi30_pi34_fueraDeGrilla_da422ConMensajeLegible() {
        Socio s = socioAlDia();
        LocalDate dia = diaHabil(2);

        ResponseEntity<String> mediaHora = reservar(s.token(), franja(dia, 10, 30));
        assertThat(mediaHora.getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
        assertThat(mediaHora.getBody()).contains("grilla del gimnasio");

        assertThat(reservar(s.token(), franja(dia, 21, 0)).getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
    }

    @Test
    void pi11_pi14_pi87_cancelarEnTiempoLiberaElCupo() {
        Socio s = socioAlDia();
        LocalDate dia = diaHabil(2);
        int antes = ocupados(dia, 12);
        TurnoResponse t = reservarOk(s.token(), franja(dia, 12, 0));
        assertThat(ocupados(dia, 12)).isEqualTo(antes + 1);

        ResponseEntity<TurnoResponse> cancelado = llamar(
                HttpMethod.PATCH, "/api/turnos/" + t.id() + "/cancelar", Map.of("motivo", "Viaje"), s.token(), TurnoResponse.class);

        assertThat(cancelado.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(cancelado.getBody().estado().name()).isEqualTo("CANCELADO_EN_TIEMPO");
        assertThat(ocupados(dia, 12)).isEqualTo(antes);
        assertThat(llamar(HttpMethod.PATCH, "/api/turnos/" + t.id() + "/cancelar", Map.of("motivo", "otra vez"), s.token(), String.class)
                        .getStatusCode())
                .isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
    }

    @Test
    void pi86_cupoCompleto_da422() {
        LocalDate dia = diaHabil(4);
        Socio a = socioAlDia();
        Socio b = socioAlDia();
        jdbcTemplate.update("UPDATE configuracion_gym SET cupo_por_franja = 1 WHERE id = 1");
        try {
            reservarOk(a.token(), franja(dia, 19, 0));
            ResponseEntity<String> lleno = reservar(b.token(), franja(dia, 19, 0));
            assertThat(lleno.getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
            assertThat(lleno.getBody()).contains("Cupo completo");
        } finally {
            jdbcTemplate.update("UPDATE configuracion_gym SET cupo_por_franja = 20 WHERE id = 1");
        }
    }

    @Test
    void pi45_personaDadaDeBaja_noReserva() {
        Socio s = socioAlDia();
        llamar(HttpMethod.PATCH, "/api/personas/" + s.persona().id() + "/baja", null, tokenAdmin, String.class);

        Map<String, Object> body = Map.of("inicio", franja(diaHabil(2), 9, 0).toString(), "personaId", s.persona().id());
        ResponseEntity<String> r = llamar(HttpMethod.POST, "/api/turnos/gym", body, tokenAdmin, String.class);

        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
        assertThat(r.getBody()).contains("dada de baja");
    }

    @Test
    void autorizacion_cancelacionAjenaCheckInYExcepciones() {
        Socio duenio = socioAlDia();
        Socio otro = socioAlDia();
        TurnoResponse t = reservarOk(duenio.token(), franja(diaHabil(2), 13, 0));
        String ruta = "/api/turnos/" + t.id();

        assertThat(llamar(HttpMethod.PATCH, ruta + "/cancelar", Map.of("motivo", "x"), otro.token(), String.class).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(llamar(HttpMethod.GET, ruta, null, otro.token(), String.class).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(llamar(HttpMethod.PATCH, ruta + "/completado", null, duenio.token(), String.class).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(llamar(HttpMethod.PATCH, ruta + "/completado", null, tokenAdmin, String.class).getStatusCode())
                .isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
        assertThat(llamar(HttpMethod.GET, "/api/turnos?tipo=GYM&personaId=" + duenio.persona().id(), null, tokenAdmin, TurnoResponse[].class)
                        .getBody())
                .extracting(TurnoResponse::id)
                .containsExactly(t.id());
        assertThat(llamar(HttpMethod.GET, "/api/turnos", null, duenio.token(), String.class).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);

        Map<String, Object> exc = Map.of("personaId", duenio.persona().id(), "motivo", "x", "validaHasta", "2020-01-01", "unSoloUso", false);
        assertThat(llamar(HttpMethod.POST, "/api/excepciones-morosidad", exc, duenio.token(), String.class).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(llamar(HttpMethod.POST, "/api/excepciones-morosidad", exc, tokenAdmin, String.class).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);
    }

    // ------------------------------------------------------------------ estado de gimnasio

    private ResponseEntity<EstadoGymResponse> estado(String token, Long personaId) {
        String ruta = "/api/turnos/gym/estado" + (personaId == null ? "" : "?personaId=" + personaId);
        return llamar(HttpMethod.GET, ruta, null, token, EstadoGymResponse.class);
    }

    private HttpStatus estadoHttp(String token, Long personaId) {
        String ruta = "/api/turnos/gym/estado" + (personaId == null ? "" : "?personaId=" + personaId);
        return HttpStatus.valueOf(llamar(HttpMethod.GET, ruta, null, token, String.class).getStatusCode().value());
    }

    private int umbral() {
        return jdbcTemplate.queryForObject("SELECT meses_tolerancia_morosidad FROM configuracion_gym WHERE id = 1", Integer.class);
    }

    @Test
    void estadoGym_alDiaSuspendidoYConExcepcion_coincideConLaReserva() {
        Socio alDia = socioAlDia();
        EstadoGymResponse e = estado(alDia.token(), null).getBody();
        assertThat(e).isEqualTo(new EstadoGymResponse(true, false, 0, umbral(), false));

        Socio moroso = socioSuspendido();
        EstadoGymResponse suspendido = estado(moroso.token(), null).getBody();
        assertThat(suspendido.esSocioGym()).isTrue();
        assertThat(suspendido.suspendido()).isTrue();
        assertThat(suspendido.excepcionVigente()).isFalse();
        assertThat(suspendido.periodosImpagos()).isGreaterThanOrEqualTo(suspendido.umbral());

        Map<String, Object> exc = Map.of(
                "personaId", moroso.persona().id(),
                "motivo", "Plan de pago acordado",
                "validaHasta", LocalDate.now(ZONA).plusMonths(1).toString(),
                "unSoloUso", true);
        llamar(HttpMethod.POST, "/api/excepciones-morosidad", exc, tokenAdmin, String.class);
        EstadoGymResponse conExcepcion = estado(moroso.token(), null).getBody();
        assertThat(conExcepcion.suspendido()).isFalse();
        assertThat(conExcepcion.excepcionVigente()).isTrue();
        assertThat(conExcepcion.periodosImpagos()).isEqualTo(suspendido.periodosImpagos());

        reservarOk(moroso.token(), franja(diaHabil(2), 15, 0));
        EstadoGymResponse agotada = estado(moroso.token(), null).getBody();
        assertThat(agotada.suspendido()).isTrue();
        assertThat(agotada.excepcionVigente()).isFalse();
    }

    @Test
    void estadoGym_matrizDeRoles() {
        Socio a = socioAlDia();
        Socio b = socioAlDia();

        assertThat(estadoHttp(a.token(), a.persona().id())).isEqualTo(HttpStatus.OK);
        assertThat(estadoHttp(a.token(), b.persona().id())).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(estado(tokenAdmin, b.persona().id()).getBody().esSocioGym()).isTrue();
        assertThat(estadoHttp(tokenAdmin, null)).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(estadoHttp(tokenAdmin, 999_999_999L)).isEqualTo(HttpStatus.NOT_FOUND);

        String emailProfesional = "prof-g-" + UUID.randomUUID() + "@vitalys.test";
        Map<String, Object> datos = Map.of("nombre", "Nora", "apellido", "Gil", "especialidad", "NUTRICION", "duracionTurnoMinutos", 30);
        llamar(HttpMethod.POST, "/api/profesionales", Map.of("email", emailProfesional, "contrasena", CLAVE, "datos", datos), tokenAdmin, String.class);
        assertThat(estadoHttp(login(emailProfesional), null)).isEqualTo(HttpStatus.FORBIDDEN);

        String emailSinFicha = "sinficha-" + UUID.randomUUID() + "@vitalys.test";
        usuarioRepository.save(new Usuario(emailSinFicha, passwordEncoder.encode(CLAVE), RolUsuario.SOCIO_PACIENTE));
        assertThat(estadoHttp(login(emailSinFicha), null)).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
    }

    @Test
    void personaSinMembresiaDeGimnasio_estadoSinMembresiaYLaReservaLaRechazaElMotor() {
        String email = "paciente-" + UUID.randomUUID() + "@mail.test";
        Map<String, Object> datos = new LinkedHashMap<>();
        datos.put("nombre", "Carlos");
        datos.put("apellido", "Soto");
        datos.put("dni", String.valueOf(ThreadLocalRandom.current().nextInt(10_000_000, 99_999_999)));
        datos.put("esSocioGym", false);
        llamar(HttpMethod.POST, "/api/personas", Map.of("email", email, "contrasena", CLAVE, "datos", datos), tokenAdmin, PersonaResponse.class);
        String token = login(email);

        assertThat(estado(token, null).getBody()).isEqualTo(new EstadoGymResponse(false, false, 0, 0, false));

        ResponseEntity<String> r = reservar(token, franja(diaHabil(2), 10, 0));
        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
        assertThat(r.getBody()).contains("no tiene membresía de gimnasio");
    }

    @Test
    void cupo_domingoSinFranjasYFechaFaltante400() {
        LocalDate domingo = LocalDate.now(ZONA).plusWeeks(2).with(DayOfWeek.SUNDAY);
        assertThat(llamar(HttpMethod.GET, "/api/turnos/gym/cupo?fecha=" + domingo, null, tokenAdmin, FranjaGymResponse[].class)
                        .getBody())
                .isEmpty();
        assertThat(llamar(HttpMethod.GET, "/api/turnos/gym/cupo", null, tokenAdmin, String.class).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);
    }
}
