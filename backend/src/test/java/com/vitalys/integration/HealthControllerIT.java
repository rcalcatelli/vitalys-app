package com.vitalys.integration;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

/** GET /api/health → 200 sin token (specs/health-check/spec.md). */
class HealthControllerIT extends IntegrationTestBase {

    @Test
    void healthCheck_sinToken_devuelve200ConStatusUp() {
        ResponseEntity<String> response = restTemplate.getForEntity(urlBase() + "/api/health", String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).contains("\"status\":\"UP\"");
    }
}
