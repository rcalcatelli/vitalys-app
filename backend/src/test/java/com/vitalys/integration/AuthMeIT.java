package com.vitalys.integration;

import static org.assertj.core.api.Assertions.assertThat;

import com.vitalys.dto.LoginResponse;
import com.vitalys.dto.MeResponse;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

/** Smoke A4.6: GET /api/auth/me con JWT válido → 200 sin password_hash; sin token → 401. */
class AuthMeIT extends IntegrationTestBase {

    @Test
    void me_conJwtValido_devuelve200SinPasswordHash() {
        String email = "me-" + UUID.randomUUID() + "@vitalys.test";
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("email", email);
        body.put("contrasena", "password123");

        ResponseEntity<LoginResponse> registro =
                restTemplate.postForEntity(urlBase() + "/api/auth/registro", body, LoginResponse.class);
        String token = registro.getBody().getToken();

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        HttpEntity<Void> request = new HttpEntity<>(headers);

        ResponseEntity<String> response =
                restTemplate.exchange(urlBase() + "/api/auth/me", HttpMethod.GET, request, String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).doesNotContain("password_hash").doesNotContain("passwordHash");

        ResponseEntity<MeResponse> parsed =
                restTemplate.exchange(urlBase() + "/api/auth/me", HttpMethod.GET, request, MeResponse.class);
        assertThat(parsed.getBody().getEmail()).isEqualTo(email);
    }

    @Test
    void me_sinToken_devuelve401() {
        ResponseEntity<String> response = restTemplate.getForEntity(urlBase() + "/api/auth/me", String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }
}
