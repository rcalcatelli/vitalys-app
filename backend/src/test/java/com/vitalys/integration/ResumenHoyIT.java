package com.vitalys.integration;

import static org.assertj.core.api.Assertions.assertThat;

import com.vitalys.domain.RolUsuario;
import com.vitalys.domain.Usuario;
import com.vitalys.dto.LoginResponse;
import com.vitalys.dto.PersonaResponse;
import com.vitalys.dto.ResumenHoyResponse;
import com.vitalys.repository.UsuarioRepository;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;

/** PI-108: el panel del ADMIN lista a un socio suspendido y responde 403 a un socio. */
class ResumenHoyIT extends IntegrationTestBase {

    private static final ZoneId ZONA = ZoneId.of("America/Argentina/Buenos_Aires");
    private static final String CLAVE = "Admin1234!";

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private String login(String email) {
        return restTemplate
                .postForEntity(urlBase() + "/api/auth/login", Map.of("identificador", email, "contrasena", CLAVE), LoginResponse.class)
                .getBody()
                .getToken();
    }

    private <T> ResponseEntity<T> llamar(HttpMethod metodo, String ruta, Object body, String token, Class<T> tipo) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        return restTemplate.exchange(urlBase() + ruta, metodo, new HttpEntity<>(body, headers), tipo);
    }

    @Test
    void pi108_listaAlSuspendidoYEsSoloParaAdmin() {
        String emailAdmin = "admin-r-" + UUID.randomUUID() + "@vitalys.test";
        usuarioRepository.save(new Usuario(emailAdmin, passwordEncoder.encode(CLAVE), RolUsuario.ADMIN));
        String tokenAdmin = login(emailAdmin);
        String emailSocio = "res-" + UUID.randomUUID() + "@mail.test";
        Map<String, Object> datos = new LinkedHashMap<>();
        datos.put("nombre", "Suspendido");
        datos.put("apellido", "Panel");
        datos.put("dni", String.valueOf(ThreadLocalRandom.current().nextInt(10_000_000, 99_999_999)));
        datos.put("esSocioGym", true);
        datos.put("fechaInicioMembresia", LocalDate.now(ZONA).withDayOfMonth(1).minusMonths(9).toString());
        PersonaResponse persona = llamar(
                        HttpMethod.POST, "/api/personas", Map.of("email", emailSocio, "contrasena", CLAVE, "datos", datos), tokenAdmin,
                        PersonaResponse.class)
                .getBody();

        ResponseEntity<ResumenHoyResponse> r =
                llamar(HttpMethod.GET, "/api/admin/resumen-hoy", null, tokenAdmin, ResumenHoyResponse.class);

        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(r.getBody().fecha()).isEqualTo(LocalDate.now(ZONA));
        assertThat(r.getBody().requierenAtencion())
                .anySatisfy(s -> {
                    assertThat(s.personaId()).isEqualTo(persona.id());
                    assertThat(s.suspendido()).isTrue();
                    assertThat(s.periodosImpagos()).isGreaterThanOrEqualTo(s.umbral());
                });
        assertThat(llamar(HttpMethod.GET, "/api/admin/resumen-hoy", null, login(emailSocio), String.class).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
    }
}
