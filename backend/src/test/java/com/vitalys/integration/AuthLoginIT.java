package com.vitalys.integration;

import static org.assertj.core.api.Assertions.assertThat;

import com.vitalys.domain.Usuario;
import com.vitalys.dto.LoginResponse;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import com.vitalys.repository.UsuarioRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

/** PI-03 (login exitoso), PI-04 (contraseña incorrecta), PI-29 (cuenta deshabilitada). */
class AuthLoginIT extends IntegrationTestBase {

    @Autowired
    private UsuarioRepository usuarioRepository;

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

    @Test
    void loginConCuentaDeshabilitada_devuelve401AunqueLaContrasenaSeaCorrecta() {
        String email = registrarUsuario("login-baja-" + UUID.randomUUID() + "@vitalys.test", "password123");

        Usuario usuario = usuarioRepository.findByEmail(email).orElseThrow();
        usuario.setActivo(false); // baja lógica: usuarios.activo = FALSE
        usuarioRepository.save(usuario);

        // La contraseña es la correcta. Lo que debe frenar el login es la cuenta deshabilitada,
        // y el 401 tiene que ser indistinguible del de una contraseña incorrecta (RF-32).
        ResponseEntity<String> response =
                restTemplate.postForEntity(urlBase() + "/api/auth/login", body(email, "password123"), String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }
}
