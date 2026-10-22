package com.vitalys.integration;

import static org.assertj.core.api.Assertions.assertThat;

import com.vitalys.domain.RolUsuario;
import com.vitalys.domain.Usuario;
import com.vitalys.dto.LoginResponse;
import com.vitalys.dto.PersonaResponse;
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

/** PI-19 a PI-21 y el camino feliz de RF-31 / HU-07, contra Postgres real. */
class PersonaVinculoIT extends IntegrationTestBase {

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
        String email = "admin-v-" + UUID.randomUUID() + "@vitalys.test";
        usuarioRepository.save(new Usuario(email, passwordEncoder.encode(CLAVE), RolUsuario.ADMIN));
        tokenAdmin = login(email);
    }

    private String login(String identificador) {
        return restTemplate
                .postForEntity(urlBase() + "/api/auth/login", Map.of("identificador", identificador, "contrasena", CLAVE), LoginResponse.class)
                .getBody()
                .getToken();
    }

    /** Registro público: el usuario queda creado sin ficha de persona (CA-01-6). */
    private String registrar() {
        String email = "reg-" + UUID.randomUUID() + "@mail.test";
        restTemplate.postForEntity(
                urlBase() + "/api/auth/registro", Map.of("email", email, "contrasena", CLAVE), LoginResponse.class);
        return email;
    }

    private static String dni() {
        return String.valueOf(ThreadLocalRandom.current().nextInt(10_000_000, 99_999_999));
    }

    private static Map<String, Object> vinculo(String email, String dni) {
        Map<String, Object> datos = new LinkedHashMap<>();
        datos.put("nombre", "Laura");
        datos.put("apellido", "Benítez");
        datos.put("dni", dni);
        datos.put("esSocioGym", false);
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("email", email);
        body.put("datos", datos);
        return body;
    }

    private <T> ResponseEntity<T> vincular(Object body, String token, Class<T> tipo) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        return restTemplate.exchange(
                urlBase() + "/api/personas/vincular", HttpMethod.POST, new HttpEntity<>(body, headers), tipo);
    }

    private int personas() {
        return jdbcTemplate.queryForObject("SELECT COUNT(*) FROM personas", Integer.class);
    }

    @Test
    void vinculoExitoso_usaElMismoUsuarioYPermiteLoginPorDni() {
        String email = registrar();
        Long usuarioId = usuarioRepository.findByEmail(email).orElseThrow().getId();
        String dni = dni();
        int usuariosAntes = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM usuarios", Integer.class);

        ResponseEntity<PersonaResponse> r = vincular(vinculo(email, dni), tokenAdmin, PersonaResponse.class);

        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(r.getBody().usuarioId()).isEqualTo(usuarioId);
        assertThat(jdbcTemplate.queryForObject("SELECT COUNT(*) FROM usuarios", Integer.class)).isEqualTo(usuariosAntes);
        assertThat(login(dni)).isNotBlank();
    }

    @Test
    void pi19_emailSinUsuario_404YNingunaPersonaCreada() {
        int antes = personas();
        ResponseEntity<String> r = vincular(vinculo("nadie-" + UUID.randomUUID() + "@mail.test", dni()), tokenAdmin, String.class);
        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(personas()).isEqualTo(antes);
    }

    @Test
    void pi20_usuarioYaVinculado_409() {
        String email = registrar();
        vincular(vinculo(email, dni()), tokenAdmin, String.class);

        assertThat(vincular(vinculo(email, dni()), tokenAdmin, String.class).getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    void pi21_actorNoAdmin_403AunqueElEmailNoExista() {
        String tokenSocio = login(registrar());
        ResponseEntity<String> r = vincular(vinculo("nadie-" + UUID.randomUUID() + "@mail.test", dni()), tokenSocio, String.class);
        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void conContrasenaEnElBody_400() {
        Map<String, Object> body = vinculo(registrar(), dni());
        body.put("contrasena", "otraClave123");
        assertThat(vincular(body, tokenAdmin, String.class).getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void usuarioAdmin_noSeVincula_422() {
        String email = "admin2-" + UUID.randomUUID() + "@vitalys.test";
        usuarioRepository.save(new Usuario(email, passwordEncoder.encode(CLAVE), RolUsuario.ADMIN));
        assertThat(vincular(vinculo(email, dni()), tokenAdmin, String.class).getStatusCode())
                .isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
    }
}
