package com.vitalys.integration;

import static org.assertj.core.api.Assertions.assertThat;

import com.vitalys.dto.LoginResponse;
import com.vitalys.dto.MeResponse;
import com.vitalys.domain.RolUsuario;
import com.vitalys.domain.Usuario;
import com.vitalys.repository.UsuarioRepository;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;

/** Smoke A4.6: GET /api/auth/me con JWT válido → 200 sin password_hash; sin token → 401. */
class AuthMeIT extends IntegrationTestBase {

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

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
        // Recién registrado, sin ficha: nombre y apellido null (CA-01-8, RF-40)
        assertThat(parsed.getBody().getNombre()).isNull();
        assertThat(parsed.getBody().getApellido()).isNull();
    }

    @Test
    void me_deUnProfesional_traeNombreYApellidoDeSuFicha() {
        String emailAdmin = "admin-me-" + UUID.randomUUID() + "@vitalys.test";
        usuarioRepository.save(new Usuario(emailAdmin, passwordEncoder.encode("Admin1234!"), RolUsuario.ADMIN));
        String tokenAdmin = restTemplate
                .postForEntity(
                        urlBase() + "/api/auth/login",
                        Map.of("identificador", emailAdmin, "contrasena", "Admin1234!"),
                        LoginResponse.class)
                .getBody()
                .getToken();
        String emailProf = "prof-me-" + UUID.randomUUID() + "@vitalys.test";
        HttpHeaders ha = new HttpHeaders();
        ha.setBearerAuth(tokenAdmin);
        Map<String, Object> datos = Map.of(
                "nombre", "Valentina", "apellido", "Méndez", "especialidad", "NUTRICION", "duracionTurnoMinutos", 30);
        Map<String, Object> alta = Map.of("email", emailProf, "contrasena", "Admin1234!", "datos", datos);
        ResponseEntity<String> creado =
                restTemplate.exchange(urlBase() + "/api/profesionales", HttpMethod.POST, new HttpEntity<>(alta, ha), String.class);
        assertThat(creado.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        String tokenProf = restTemplate
                .postForEntity(
                        urlBase() + "/api/auth/login",
                        Map.of("identificador", emailProf, "contrasena", "Admin1234!"),
                        LoginResponse.class)
                .getBody()
                .getToken();
        HttpHeaders hp = new HttpHeaders();
        hp.setBearerAuth(tokenProf);

        MeResponse me = restTemplate
                .exchange(urlBase() + "/api/auth/me", HttpMethod.GET, new HttpEntity<>(hp), MeResponse.class)
                .getBody();

        assertThat(me.getNombre()).isEqualTo("Valentina");
        assertThat(me.getApellido()).isEqualTo("Méndez");
    }

    @Test
    void me_sinToken_devuelve401() {
        ResponseEntity<String> response = restTemplate.getForEntity(urlBase() + "/api/auth/me", String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }
}
