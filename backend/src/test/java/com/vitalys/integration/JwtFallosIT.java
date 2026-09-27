package com.vitalys.integration;

import static org.assertj.core.api.Assertions.assertThat;

import com.vitalys.config.JwtProperties;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.Date;
import javax.crypto.SecretKey;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

/**
 * PI-22 (JWT expirado), PI-23 (JWT malformado), PI-24 (JWT firmado con otra clave): las tres
 * ejercitan la rama en la que {@code JwtAuthenticationFilter} recibe un header {@code Bearer}
 * presente pero {@code JwtService.esValido()} devuelve {@code false} — hasta ahora sin cobertura
 * en el stack HTTP real, porque {@code SecurityIT}/{@code AuthMeIT} solo prueban "sin token" (el
 * filtro ni entra al bloque {@code if}) o "token válido" (siempre la rama {@code true}). El
 * equivalente unitario de {@code esValido()} en aislamiento vive en {@code JwtServiceTest}.
 */
class JwtFallosIT extends IntegrationTestBase {

    @Autowired
    private JwtProperties jwtProperties;

    private ResponseEntity<String> meConToken(String token) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        HttpEntity<Void> request = new HttpEntity<>(headers);
        return restTemplate.exchange(urlBase() + "/api/auth/me", HttpMethod.GET, request, String.class);
    }

    @Test
    void tokenExpirado_devuelve401() {
        SecretKey claveDeLaApp = Keys.hmacShaKeyFor(jwtProperties.getSecret().getBytes(StandardCharsets.UTF_8));
        Date haceDosHoras = new Date(System.currentTimeMillis() - 7_200_000L);
        Date haceUnaHora = new Date(System.currentTimeMillis() - 3_600_000L);

        String tokenExpirado = Jwts.builder()
                .subject("expirado@vitalys.test")
                .claim("rol", "SOCIO_PACIENTE")
                .claim("usuarioId", 1L)
                .issuedAt(haceDosHoras)
                .expiration(haceUnaHora) // ya vencido
                .signWith(claveDeLaApp)
                .compact();

        ResponseEntity<String> response = meConToken(tokenExpirado);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void tokenMalformado_devuelve401() {
        ResponseEntity<String> response = meConToken("esto-no-es-un-jwt");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void tokenConFirmaDistintaALaDeLaApp_devuelve401() {
        byte[] bytes = new byte[32];
        new SecureRandom().nextBytes(bytes);
        String otroSecreto = Base64.getEncoder().encodeToString(bytes);
        SecretKey otraClave = Keys.hmacShaKeyFor(otroSecreto.getBytes(StandardCharsets.UTF_8));

        String tokenFirmaDistinta = Jwts.builder()
                .subject("otra-firma@vitalys.test")
                .claim("rol", "SOCIO_PACIENTE")
                .claim("usuarioId", 1L)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + 3_600_000L))
                .signWith(otraClave)
                .compact();

        ResponseEntity<String> response = meConToken(tokenFirmaDistinta);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }
}
