package com.vitalys.integration;

import static org.assertj.core.api.Assertions.assertThat;

import com.vitalys.domain.RolUsuario;
import com.vitalys.domain.Usuario;
import com.vitalys.dto.LoginResponse;
import com.vitalys.dto.PersonaResponse;
import com.vitalys.dto.ProfesionalResponse;
import com.vitalys.repository.UsuarioRepository;
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
 * T3-10: ABM de profesionales contra Postgres real. Cubre el alta atómica (usuario PROFESIONAL +
 * profesional), el 409 por email repetido, los 403 por rol, {@code /me}, y que un token vigente
 * deja de servir cuando el usuario se deshabilita (JWT + {@code usuarios.activo}).
 */
@SuppressWarnings("unchecked")
class ProfesionalIT extends IntegrationTestBase {

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
        String email = "admin-" + UUID.randomUUID() + "@vitalys.test";
        usuarioRepository.save(new Usuario(email, passwordEncoder.encode(CLAVE), RolUsuario.ADMIN));
        tokenAdmin = login(email);
    }

    private String login(String email) {
        Map<String, Object> body = Map.of("identificador", email, "contrasena", CLAVE);
        return restTemplate
                .postForEntity(urlBase() + "/api/auth/login", body, LoginResponse.class)
                .getBody()
                .getToken();
    }

    private static Map<String, Object> datos(String nombre) {
        Map<String, Object> datos = new LinkedHashMap<>();
        datos.put("nombre", nombre);
        datos.put("apellido", "Prueba");
        datos.put("especialidad", "KINESIOLOGIA");
        datos.put("duracionTurnoMinutos", 45);
        return datos;
    }

    private static Map<String, Object> alta(String email, String nombre) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("email", email);
        body.put("contrasena", CLAVE);
        body.put("datos", datos(nombre));
        return body;
    }

    private <T> ResponseEntity<T> llamar(HttpMethod metodo, String ruta, Object body, String token, Class<T> tipo) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        return restTemplate.exchange(urlBase() + ruta, metodo, new HttpEntity<>(body, headers), tipo);
    }

    private ProfesionalResponse crearProfesional(String email) {
        ResponseEntity<ProfesionalResponse> r =
                llamar(HttpMethod.POST, "/api/profesionales", alta(email, "Ana"), tokenAdmin, ProfesionalResponse.class);
        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        return r.getBody();
    }

    private static String emailNuevo() {
        return "prof-" + UUID.randomUUID() + "@vitalys.test";
    }

    @Test
    void alta_creaUsuarioProfesionalQuePuedeLoguearse() {
        String email = emailNuevo();
        ProfesionalResponse creado = crearProfesional(email);

        assertThat(creado.activo()).isTrue();
        assertThat(creado.especialidad().name()).isEqualTo("KINESIOLOGIA");
        assertThat(usuarioRepository.findByEmail(email).orElseThrow().getRol()).isEqualTo(RolUsuario.PROFESIONAL);
        assertThat(login(email)).isNotBlank();
    }

    @Test
    void emailRepetido_devuelve409YNoCreaOtroProfesional() {
        String email = emailNuevo();
        crearProfesional(email);

        ResponseEntity<String> r =
                llamar(HttpMethod.POST, "/api/profesionales", alta(email, "Otra"), tokenAdmin, String.class);

        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        Integer filas = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM profesionales p JOIN usuarios u ON u.id = p.usuario_id WHERE u.email = ?",
                Integer.class,
                email);
        assertThat(filas).isEqualTo(1);
    }

    @Test
    void emailDePersonaExistente_tambienDevuelve409() {
        String email = "socio-" + UUID.randomUUID() + "@mail.test";
        usuarioRepository.save(new Usuario(email, "x", RolUsuario.SOCIO_PACIENTE));

        assertThat(llamar(HttpMethod.POST, "/api/profesionales", alta(email, "Ana"), tokenAdmin, String.class)
                        .getStatusCode())
                .isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    void datosInvalidos_devuelven400() {
        Map<String, Object> body = alta(emailNuevo(), "Ana");
        ((Map<String, Object>) body.get("datos")).put("duracionTurnoMinutos", 0);

        assertThat(llamar(HttpMethod.POST, "/api/profesionales", body, tokenAdmin, String.class).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void noAdmin_recibe403EnAlta_peroPuedeListarSinVerEmail() {
        String email = emailNuevo();
        crearProfesional(email);
        String tokenProfesional = login(email);

        assertThat(llamar(HttpMethod.POST, "/api/profesionales", alta(emailNuevo(), "X"), tokenProfesional, String.class)
                        .getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);

        ResponseEntity<ProfesionalResponse[]> lista =
                llamar(HttpMethod.GET, "/api/profesionales", null, tokenProfesional, ProfesionalResponse[].class);
        assertThat(lista.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(lista.getBody()).isNotEmpty().allSatisfy(p -> assertThat(p.email()).isNull());
    }

    @Test
    void socioPaciente_recibe403EnMe() {
        String email = "socio-" + UUID.randomUUID() + "@mail.test";
        usuarioRepository.save(new Usuario(email, passwordEncoder.encode(CLAVE), RolUsuario.SOCIO_PACIENTE));

        assertThat(llamar(HttpMethod.GET, "/api/profesionales/me", null, login(email), String.class).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void me_devuelveLaFichaDelProfesionalAutenticado() {
        String email = emailNuevo();
        ProfesionalResponse creado = crearProfesional(email);

        ResponseEntity<ProfesionalResponse> r =
                llamar(HttpMethod.GET, "/api/profesionales/me", null, login(email), ProfesionalResponse.class);

        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(r.getBody().id()).isEqualTo(creado.id());
    }

    @Test
    void me_sinProfesionalAsociado_devuelve404() {
        assertThat(llamar(HttpMethod.GET, "/api/profesionales/me", null, tokenAdmin, String.class).getStatusCode())
                .isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void profesional_veSuFichaConEmailYLaAjenaSinEmail() {
        String email = emailNuevo();
        ProfesionalResponse propio = crearProfesional(email);
        ProfesionalResponse ajeno = crearProfesional(emailNuevo());
        String token = login(email);

        assertThat(llamar(HttpMethod.GET, "/api/profesionales/" + propio.id(), null, token, ProfesionalResponse.class)
                        .getBody()
                        .email())
                .isEqualTo(email);
        ResponseEntity<ProfesionalResponse> vistaAjena =
                llamar(HttpMethod.GET, "/api/profesionales/" + ajeno.id(), null, token, ProfesionalResponse.class);
        assertThat(vistaAjena.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(vistaAjena.getBody().email()).isNull();
        assertThat(llamar(HttpMethod.GET, "/api/profesionales/999999", null, tokenAdmin, String.class).getStatusCode())
                .isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void paciente_puedeVerProfesionalesParaElegir_sinEmail() {
        ProfesionalResponse creado = crearProfesional(emailNuevo());
        String emailSocio = "socio-" + UUID.randomUUID() + "@mail.test";
        usuarioRepository.save(new Usuario(emailSocio, passwordEncoder.encode(CLAVE), RolUsuario.SOCIO_PACIENTE));
        String token = login(emailSocio);

        ResponseEntity<ProfesionalResponse> r =
                llamar(HttpMethod.GET, "/api/profesionales/" + creado.id(), null, token, ProfesionalResponse.class);

        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(r.getBody().email()).isNull();
        assertThat(r.getBody().nombre()).isEqualTo("Ana");
    }

    @Test
    void edicion_actualizaDatosYListadoFiltraPorEstado() {
        ProfesionalResponse creado = crearProfesional(emailNuevo());

        ResponseEntity<ProfesionalResponse> ok = llamar(
                HttpMethod.PUT, "/api/profesionales/" + creado.id(), datos("Luciana"), tokenAdmin, ProfesionalResponse.class);
        assertThat(ok.getBody().nombre()).isEqualTo("Luciana");

        ResponseEntity<ProfesionalResponse[]> activos =
                llamar(HttpMethod.GET, "/api/profesionales?activo=true", null, tokenAdmin, ProfesionalResponse[].class);
        ResponseEntity<ProfesionalResponse[]> todos =
                llamar(HttpMethod.GET, "/api/profesionales", null, tokenAdmin, ProfesionalResponse[].class);
        assertThat(activos.getBody()).extracting(ProfesionalResponse::id).contains(creado.id());
        assertThat(todos.getBody()).extracting(ProfesionalResponse::id).contains(creado.id());
    }

    @Test
    void tokenVigenteDeUsuarioDeshabilitado_devuelve401() {
        String email = emailNuevo();
        crearProfesional(email);
        String token = login(email);
        assertThat(llamar(HttpMethod.GET, "/api/profesionales/me", null, token, String.class).getStatusCode())
                .isEqualTo(HttpStatus.OK);

        jdbcTemplate.update("UPDATE usuarios SET activo = FALSE WHERE email = ?", email);

        assertThat(llamar(HttpMethod.GET, "/api/profesionales/me", null, token, String.class).getStatusCode())
                .isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void baja_sinTurnosFuturos_desactivaProfesionalYUsuarioYBorraFranjas() {
        String email = emailNuevo();
        ProfesionalResponse creado = crearProfesional(email);
        String token = login(email);
        jdbcTemplate.update(
                "INSERT INTO disponibilidad_profesional (profesional_id, dia_semana, hora_inicio, hora_fin) "
                        + "VALUES (?, 1, '09:00', '13:00')",
                creado.id());

        ResponseEntity<ProfesionalResponse> baja =
                llamar(HttpMethod.DELETE, "/api/profesionales/" + creado.id(), null, tokenAdmin, ProfesionalResponse.class);

        assertThat(baja.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(baja.getBody().activo()).isFalse();
        assertThat(jdbcTemplate.queryForObject(
                        "SELECT activo FROM usuarios WHERE email = ?", Boolean.class, email))
                .isFalse();
        assertThat(jdbcTemplate.queryForObject(
                        "SELECT COUNT(*) FROM disponibilidad_profesional WHERE profesional_id = ?",
                        Integer.class,
                        creado.id()))
                .isZero();
        // El token emitido antes de la baja ya no sirve
        assertThat(llamar(HttpMethod.GET, "/api/profesionales/me", null, token, String.class).getStatusCode())
                .isEqualTo(HttpStatus.UNAUTHORIZED);
        // Y no se puede dar de baja dos veces
        assertThat(llamar(HttpMethod.DELETE, "/api/profesionales/" + creado.id(), null, tokenAdmin, String.class)
                        .getStatusCode())
                .isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    void baja_conTurnoFuturoReservado_devuelve409YNoTocaNada() {
        ProfesionalResponse creado = crearProfesional(emailNuevo());
        PersonaResponse paciente = crearPaciente();
        jdbcTemplate.update(
                "INSERT INTO turnos (persona_id, profesional_id, tipo_turno, reservado_por_usuario_id, inicio, fin) "
                        + "VALUES (?, ?, 'CONSULTORIO', ?, NOW() + INTERVAL '30 days', NOW() + INTERVAL '30 days 30 minutes')",
                paciente.id(),
                creado.id(),
                paciente.usuarioId());

        ResponseEntity<String> r =
                llamar(HttpMethod.DELETE, "/api/profesionales/" + creado.id(), null, tokenAdmin, String.class);

        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(jdbcTemplate.queryForObject(
                        "SELECT activo FROM profesionales WHERE id = ?", Boolean.class, creado.id()))
                .isTrue();
    }

    private PersonaResponse crearPaciente() {
        Map<String, Object> datos = new LinkedHashMap<>();
        datos.put("nombre", "Pedro");
        datos.put("apellido", "Gómez");
        datos.put("dni", String.valueOf(ThreadLocalRandom.current().nextInt(10_000_000, 99_999_999)));
        datos.put("esSocioGym", false);
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("email", "pac-" + UUID.randomUUID() + "@mail.test");
        body.put("contrasena", CLAVE);
        body.put("datos", datos);
        ResponseEntity<PersonaResponse> r =
                llamar(HttpMethod.POST, "/api/personas", body, tokenAdmin, PersonaResponse.class);
        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        return r.getBody();
    }
}
