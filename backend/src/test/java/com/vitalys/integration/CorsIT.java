package com.vitalys.integration;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

/**
 * PI-27: preflight CORS sobre una ruta pública ({@code /api/health}) refleja el origen del
 * request y permite el método solicitado, tal como configura {@code CorsConfig}
 * ({@code allowedOriginPatterns("*")}, {@code allowedMethods(...)} sobre {@code /api/**}).
 *
 * <p>PI-28 cubre el caso que de verdad importa en producción: el preflight sobre una ruta
 * PROTEGIDA. El navegador nunca manda el header {@code Authorization} en un preflight, así que
 * sin {@code HttpSecurity.cors(...)} la cadena de seguridad lo rechazaba con 401 y el frontend
 * en Vercel no podía llamar a ningún endpoint autenticado. Este test es la regresión de ese bug.
 */
class CorsIT extends IntegrationTestBase {

    @Test
    void preflightSobreRutaPublica_reflejaOrigenYPermiteMetodo() {
        HttpHeaders headers = new HttpHeaders();
        headers.setOrigin("https://vitalys-frontend.vercel.app");
        headers.set(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "GET");
        HttpEntity<Void> request = new HttpEntity<>(headers);

        ResponseEntity<String> response =
                restTemplate.exchange(urlBase() + "/api/health", HttpMethod.OPTIONS, request, String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getHeaders().getAccessControlAllowOrigin())
                .isEqualTo("https://vitalys-frontend.vercel.app");
        assertThat(response.getHeaders().getAccessControlAllowMethods()).contains(HttpMethod.GET);
    }

    @Test
    void preflightSobreRutaProtegida_noLoBloqueaLaCadenaDeSeguridad() {
        HttpHeaders headers = new HttpHeaders();
        headers.setOrigin("https://vitalys-frontend.vercel.app");
        headers.set(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "GET");
        headers.set(HttpHeaders.ACCESS_CONTROL_REQUEST_HEADERS, "authorization");
        HttpEntity<Void> request = new HttpEntity<>(headers);

        // /api/auth/me exige JWT, y el preflight viaja SIN Authorization: si la cadena de
        // seguridad lo evaluara como una request normal, respondería 401 y el navegador
        // bloquearía la llamada real.
        ResponseEntity<String> response =
                restTemplate.exchange(urlBase() + "/api/auth/me", HttpMethod.OPTIONS, request, String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getHeaders().getAccessControlAllowOrigin())
                .isEqualTo("https://vitalys-frontend.vercel.app");
        assertThat(response.getHeaders().getAccessControlAllowMethods()).contains(HttpMethod.GET);
    }
}
