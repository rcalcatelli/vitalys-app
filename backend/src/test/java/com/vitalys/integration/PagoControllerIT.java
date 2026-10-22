package com.vitalys.integration;

import static org.assertj.core.api.Assertions.assertThat;

import com.vitalys.domain.RolUsuario;
import com.vitalys.domain.Usuario;
import com.vitalys.dto.LoginResponse;
import com.vitalys.dto.PagoResponse;
import com.vitalys.dto.PersonaResponse;
import com.vitalys.dto.ProfesionalResponse;
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
 * Registro de pagos contra Postgres real: el 201 de cuota y sesión, y cada rechazo del motor
 * (unique, CHECK, trigger de sesión, clave foránea) traducido al código HTTP correcto.
 */
class PagoControllerIT extends IntegrationTestBase {

    private static final ZoneId ZONA = ZoneId.of("America/Argentina/Buenos_Aires");
    private static final String CLAVE = "Admin1234!";

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private String tokenAdmin;
    private String tokenProfesional;
    private ProfesionalResponse profesional;
    private LocalDate dia;
    private LocalDate inicioMembresia;

    @BeforeEach
    void escenario() {
        String emailAdmin = "admin-p-" + UUID.randomUUID() + "@vitalys.test";
        usuarioRepository.save(new Usuario(emailAdmin, passwordEncoder.encode(CLAVE), RolUsuario.ADMIN));
        tokenAdmin = login(emailAdmin);

        String emailProfesional = "nutri-p-" + UUID.randomUUID() + "@vitalys.test";
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
        inicioMembresia = LocalDate.now(ZONA).withDayOfMonth(1).minusMonths(2);
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

    private record Persona(PersonaResponse datos, String token) {}

    private Persona persona(boolean socioGym) {
        String email = "pagos-" + UUID.randomUUID() + "@mail.test";
        Map<String, Object> datos = new LinkedHashMap<>();
        datos.put("nombre", "Paciente");
        datos.put("apellido", "Prueba");
        datos.put("dni", String.valueOf(ThreadLocalRandom.current().nextInt(10_000_000, 99_999_999)));
        datos.put("esSocioGym", socioGym);
        if (socioGym) {
            datos.put("fechaInicioMembresia", inicioMembresia.toString());
        }
        PersonaResponse creada = llamar(
                        HttpMethod.POST, "/api/personas", Map.of("email", email, "contrasena", CLAVE, "datos", datos), tokenAdmin,
                        PersonaResponse.class)
                .getBody();
        return new Persona(creada, login(email));
    }

    private OffsetDateTime hora(int h, int m) {
        return dia.atTime(h, m).atZone(ZONA).toOffsetDateTime();
    }

    private TurnoResponse reservarConsultorio(Persona p, int h, int m) {
        ResponseEntity<TurnoResponse> r = llamar(
                HttpMethod.POST,
                "/api/turnos",
                Map.of("profesionalId", profesional.id(), "inicio", hora(h, m).toString()),
                p.token(),
                TurnoResponse.class);
        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        return r.getBody();
    }

    private TurnoResponse reservarGym(Persona p) {
        LocalDate d = dia;
        while (jdbcTemplate.queryForObject("SELECT COUNT(*) FROM feriados WHERE fecha = ?", Integer.class, d) > 0) {
            d = d.plusDays(7);
        }
        ResponseEntity<TurnoResponse> r = llamar(
                HttpMethod.POST,
                "/api/turnos/gym",
                Map.of("inicio", d.atTime(15, 0).atZone(ZONA).toOffsetDateTime().toString()),
                p.token(),
                TurnoResponse.class);
        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        return r.getBody();
    }

    private Map<String, Object> cuota(Persona p, LocalDate periodo) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("personaId", p.datos().id());
        body.put("concepto", "CUOTA_MENSUAL");
        body.put("monto", 15000);
        body.put("medio", "EFECTIVO");
        body.put("periodo", periodo == null ? null : periodo.toString());
        return body;
    }

    private Map<String, Object> sesion(Persona p, Long turnoId) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("personaId", p.datos().id());
        body.put("concepto", "SESION_CONSULTORIO");
        body.put("monto", 8000);
        body.put("medio", "TRANSFERENCIA");
        body.put("turnoId", turnoId);
        return body;
    }

    private ResponseEntity<String> registrar(Map<String, Object> body) {
        return llamar(HttpMethod.POST, "/api/pagos", body, tokenAdmin, String.class);
    }

    // ------------------------------------------------------------------ registro feliz

    @Test
    void pi76_cuotaValida_da201ConMedioYFecha() {
        Persona socia = persona(true);

        ResponseEntity<PagoResponse> r =
                llamar(HttpMethod.POST, "/api/pagos", cuota(socia, inicioMembresia), tokenAdmin, PagoResponse.class);

        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(r.getBody().id()).isNotNull();
        assertThat(r.getBody().medio().name()).isEqualTo("EFECTIVO");
        assertThat(r.getBody().periodo()).isEqualTo(inicioMembresia);
        assertThat(r.getBody().fechaPago()).isNotNull();
        assertThat(jdbcTemplate.queryForObject("SELECT medio::text FROM pagos WHERE id = ?", String.class, r.getBody().id()))
                .isEqualTo("EFECTIVO");
    }

    @Test
    void pi76_cuotaDePeriodoFuturo_da201() {
        Persona socia = persona(true);

        assertThat(registrar(cuota(socia, LocalDate.now(ZONA).withDayOfMonth(1).plusMonths(3))).getStatusCode())
                .isEqualTo(HttpStatus.CREATED);
    }

    @Test
    void pi76_sesionDeTurnoDeConsultorio_da201() {
        Persona paciente = persona(true);
        TurnoResponse turno = reservarConsultorio(paciente, 9, 0);

        ResponseEntity<PagoResponse> r =
                llamar(HttpMethod.POST, "/api/pagos", sesion(paciente, turno.id()), tokenAdmin, PagoResponse.class);

        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(r.getBody().turnoId()).isEqualTo(turno.id());
        assertThat(r.getBody().medio().name()).isEqualTo("TRANSFERENCIA");
    }

    // ------------------------------------------------------------------ rechazos del motor

    @Test
    void pi77_cuotaDuplicada_da409() {
        Persona socia = persona(true);
        assertThat(registrar(cuota(socia, inicioMembresia)).getStatusCode()).isEqualTo(HttpStatus.CREATED);

        ResponseEntity<String> r = registrar(cuota(socia, inicioMembresia));

        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(r.getBody()).contains("ya tiene la cuota").doesNotContain("email");
    }

    @Test
    void pi78_sesionSinTurno_da422() {
        Persona paciente = persona(true);

        ResponseEntity<String> r = registrar(sesion(paciente, null));

        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
    }

    @Test
    void pi79_segundoPagoDelMismoTurno_da409() {
        Persona paciente = persona(true);
        TurnoResponse turno = reservarConsultorio(paciente, 9, 0);
        assertThat(registrar(sesion(paciente, turno.id())).getStatusCode()).isEqualTo(HttpStatus.CREATED);

        ResponseEntity<String> r = registrar(sesion(paciente, turno.id()));

        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(r.getBody()).contains("ya tiene un pago");
    }

    @Test
    void pi80_periodoQueNoEsDiaUno_da422() {
        Persona socia = persona(true);

        ResponseEntity<String> r = registrar(cuota(socia, inicioMembresia.withDayOfMonth(15)));

        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
    }

    // ------------------------------------------------------------------ validación de forma

    @Test
    void pi91_medioAusenteOInvalido_da400() {
        Persona socia = persona(true);
        Map<String, Object> sinMedio = cuota(socia, inicioMembresia);
        sinMedio.remove("medio");
        Map<String, Object> medioInvalido = cuota(socia, inicioMembresia);
        medioInvalido.put("medio", "BITCOIN");

        assertThat(registrar(sinMedio).getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(registrar(medioInvalido).getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void pi92_montoCeroONegativo_da400() {
        Persona socia = persona(true);
        Map<String, Object> cero = cuota(socia, inicioMembresia);
        cero.put("monto", 0);
        Map<String, Object> negativo = cuota(socia, inicioMembresia);
        negativo.put("monto", -5);

        assertThat(registrar(cero).getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(registrar(negativo).getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    // ------------------------------------------------------------------ reglas de negocio

    @Test
    void pi93_sesionDeTurnoDeGimnasio_da422() {
        Persona socia = persona(true);
        TurnoResponse gym = reservarGym(socia);

        ResponseEntity<String> r = registrar(sesion(socia, gym.id()));

        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
        assertThat(r.getBody()).contains("CONSULTORIO");
    }

    @Test
    void pi93_sesionDeTurnoDeOtraPersona_da422() {
        Persona duenia = persona(true);
        Persona otra = persona(true);
        TurnoResponse turno = reservarConsultorio(duenia, 9, 0);

        ResponseEntity<String> r = registrar(sesion(otra, turno.id()));

        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
    }

    @Test
    void pi94_cuotaDePersonaQueNoEsSocia_da422() {
        Persona noSocia = persona(false);

        ResponseEntity<String> r = registrar(cuota(noSocia, inicioMembresia));

        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
    }

    @Test
    void pi95_cuotaAnteriorAlInicioDeLaMembresia_da422() {
        Persona socia = persona(true);

        ResponseEntity<String> r = registrar(cuota(socia, inicioMembresia.minusMonths(1)));

        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
    }

    @Test
    void pi96_sesionDeTurnoCancelado_da422() {
        Persona paciente = persona(true);
        TurnoResponse turno = reservarConsultorio(paciente, 9, 0);
        llamar(HttpMethod.PATCH, "/api/turnos/" + turno.id() + "/cancelar", Map.of("motivo", "No puedo"), paciente.token(), String.class);

        ResponseEntity<String> r = registrar(sesion(paciente, turno.id()));

        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
        assertThat(r.getBody()).contains("cancelado");
    }

    @Test
    void pi97_soloElAdminRegistra_socioYProfesionalDan403() {
        Persona socia = persona(true);

        assertThat(llamar(HttpMethod.POST, "/api/pagos", cuota(socia, inicioMembresia), socia.token(), String.class).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(llamar(HttpMethod.POST, "/api/pagos", cuota(socia, inicioMembresia), tokenProfesional, String.class).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void personaInexistente_da404() {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("personaId", 999_999_999L);
        body.put("concepto", "CUOTA_MENSUAL");
        body.put("monto", 15000);
        body.put("medio", "DEBITO");
        body.put("periodo", inicioMembresia.toString());

        assertThat(registrar(body).getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void pi102_turnoInexistente_da422PorLaClaveForanea() {
        Persona paciente = persona(true);

        ResponseEntity<String> r = registrar(sesion(paciente, 999_999_999L));

        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
        assertThat(r.getBody()).contains("turno indicado no existe");
    }

    @Test
    void pi104_personaInactivaSigueSiendoCobrable() {
        Persona socia = persona(true);
        jdbcTemplate.update("UPDATE personas SET estado = 'INACTIVO', fecha_baja = CURRENT_DATE WHERE id = ?", socia.datos().id());

        assertThat(registrar(cuota(socia, inicioMembresia)).getStatusCode()).isEqualTo(HttpStatus.CREATED);
    }
}
