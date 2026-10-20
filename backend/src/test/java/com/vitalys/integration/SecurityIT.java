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
 * <p>PI-06 usa {@code POST /api/admin/feriados/sincronizar}, una ruta de administración
 * implementada y declarada en {@code docs/02-diseno/modulos.md} (RF-38). Una ruta inexistente
 * también devolvería 403 por el prefijo, sin demostrar nada.
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
                urlBase() + "/api/admin/feriados/sincronizar", org.springframework.http.HttpMethod.POST, request, String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }
}
