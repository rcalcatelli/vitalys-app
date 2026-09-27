package com.vitalys.integration;

import static org.assertj.core.api.Assertions.assertThat;

import com.vitalys.dto.LoginResponse;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

/** PI-03 (login exitoso), PI-04 (contraseña incorrecta). */
class AuthLoginIT extends IntegrationTestBase {

    private Map<String, Object> body(String email, String contrasena) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("email", email);
        body.put("contrasena", contrasena);
        return body;
    }

    private String registrarUsuario(String email, String contrasena) {
        restTemplate.postForEntity(urlBase() + "/api/auth/registro", body(email, contrasena), LoginResponse.class);
        return email;
    }

    @Test
    void loginExitoso_devuelve200ConJwt() {
        String email = registrarUsuario("login-ok-" + UUID.randomUUID() + "@vitalys.test", "password123");

        ResponseEntity<LoginResponse> response =
                restTemplate.postForEntity(urlBase() + "/api/auth/login", body(email, "password123"), LoginResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getToken()).isNotBlank();
    }

    @Test
    void loginConContrasenaIncorrecta_devuelve401() {
        String email = registrarUsuario("login-bad-" + UUID.randomUUID() + "@vitalys.test", "password123");

        ResponseEntity<String> response =
                restTemplate.postForEntity(urlBase() + "/api/auth/login", body(email, "incorrecta1"), String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }
}
