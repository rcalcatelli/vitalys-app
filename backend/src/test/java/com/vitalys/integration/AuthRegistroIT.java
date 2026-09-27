package com.vitalys.integration;

import static org.assertj.core.api.Assertions.assertThat;

import com.vitalys.dto.LoginResponse;
import com.vitalys.repository.UsuarioRepository;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

/**
 * PI-01 (registro exitoso), PI-02 (email duplicado), PI-18 (rol explícito rechazado). Ver
 * `specs/auth-registro-publico/spec.md` y `specs/auth-jwt/spec.md`.
 */
class AuthRegistroIT extends IntegrationTestBase {

    @Autowired
    private UsuarioRepository usuarioRepository;

    private Map<String, Object> body(String email, String contrasena) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("email", email);
        body.put("contrasena", contrasena);
        return body;
    }

    @Test
    void registroExitoso_devuelve201ConJwtYRolForzado() {
        String email = "socio-" + UUID.randomUUID() + "@vitalys.test";

        ResponseEntity<LoginResponse> response =
                restTemplate.postForEntity(urlBase() + "/api/auth/registro", body(email, "password123"), LoginResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getToken()).isNotBlank();
        assertThat(response.getBody().getRol().name()).isEqualTo("SOCIO_PACIENTE");

        assertThat(usuarioRepository.findByEmail(email)).isPresent();
        assertThat(usuarioRepository.findByEmail(email).get().getRol().name()).isEqualTo("SOCIO_PACIENTE");
    }

    @Test
    void registroConEmailDuplicado_devuelve409() {
        String email = "dup-" + UUID.randomUUID() + "@vitalys.test";
        restTemplate.postForEntity(urlBase() + "/api/auth/registro", body(email, "password123"), LoginResponse.class);

        ResponseEntity<String> segundo =
                restTemplate.postForEntity(urlBase() + "/api/auth/registro", body(email, "otraPassword1"), String.class);

        assertThat(segundo.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    void registroConRolExplicito_devuelve400YNoCreaUsuario() {
        String email = "rol-" + UUID.randomUUID() + "@vitalys.test";
        Map<String, Object> body = body(email, "password123");
        body.put("rol", "ADMIN");

        ResponseEntity<String> response = restTemplate.postForEntity(urlBase() + "/api/auth/registro", body, String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(usuarioRepository.findByEmail(email)).isEmpty();
    }
}
