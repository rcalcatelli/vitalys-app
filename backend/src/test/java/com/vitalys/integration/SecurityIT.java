package com.vitalys.integration;

import static org.assertj.core.api.Assertions.assertThat;

import com.vitalys.dto.LoginResponse;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

/**
 * PI-05: sin token contra un endpoint protegido → 401. PI-06: JWT válido de
 * {@code SOCIO_PACIENTE} contra un endpoint {@code ADMIN} → 403.
 *
 * <p>Nota (design.md/tasks.md): {@code /api/personas} y {@code /api/admin/personas} no tienen
 * controller todavía (Sprint 3) — Spring Security evalúa el filtro de seguridad antes de
 * resolver el dispatch al controller, así que estas rutas se pueden ejercer igual. No se crea
 * ningún controller/entidad falsos para este test.
 */
class SecurityIT extends IntegrationTestBase {

    @Test
    void sinToken_endpointProtegido_devuelve401() {
        ResponseEntity<String> response = restTemplate.getForEntity(urlBase() + "/api/personas", String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void conJwtDeSocioPaciente_endpointAdmin_devuelve403() {
        String email = "sec-" + UUID.randomUUID() + "@vitalys.test";
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("email", email);
        body.put("contrasena", "password123");

        ResponseEntity<LoginResponse> registro =
                restTemplate.postForEntity(urlBase() + "/api/auth/registro", body, LoginResponse.class);
        String token = registro.getBody().getToken();

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        HttpEntity<Void> request = new HttpEntity<>(headers);

        ResponseEntity<String> response = restTemplate.exchange(
                urlBase() + "/api/admin/personas", org.springframework.http.HttpMethod.GET, request, String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }
}
