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
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * PI-03 (login exitoso), PI-04 (contraseña incorrecta), PI-29 (cuenta deshabilitada), PI-37
 * (login por DNI, ver RF-36).
 */
class AuthLoginIT extends IntegrationTestBase {

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    /** Body de {@code POST /api/auth/login}: el identificador acepta email o DNI (RF-36). */
    private Map<String, Object> body(String identificador, String contrasena) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("identificador", identificador);
        body.put("contrasena", contrasena);
        return body;
    }

    /**
     * Body de {@code POST /api/auth/registro}, que es <strong>distinto</strong> al del login: el
     * campo se llama {@code email}, no {@code identificador} (RF-01 contra RF-36). Reutilizar el
     * body del login acá hace que {@code email} llegue nulo, que el {@code @NotBlank} devuelva 400
     * y que el usuario nunca se cree.
     */
    private Map<String, Object> bodyRegistro(String email, String contrasena) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("email", email);
        body.put("contrasena", contrasena);
        return body;
    }

    /**
     * Registra un usuario y <strong>verifica que se haya creado</strong>. La aserción no es
     * decorativa: sin ella, un registro fallido no rompe acá sino más adelante, con un 401 en el
     * login o un {@code NoSuchElementException} al buscar el usuario — síntomas que no señalan la
     * causa. El caso bajo prueba es el login, así que el registro es precondición y debe fallar
     * ruidosamente si no se cumple.
     */
    private String registrarUsuario(String email, String contrasena) {
        ResponseEntity<LoginResponse> registro = restTemplate.postForEntity(
                urlBase() + "/api/auth/registro", bodyRegistro(email, contrasena), LoginResponse.class);

        assertThat(registro.getStatusCode())
                .as("precondición: el registro de %s tiene que crear el usuario", email)
                .isEqualTo(HttpStatus.CREATED);

        return email;
    }

    /**
     * No existe entidad {@code Persona} en el backend (Sprint 3): se inserta la fila directo por
     * JDBC, igual que hace el ADMIN al completar la ficha de un usuario ya registrado.
     */
    private void crearFichaPersonaParaUsuario(String email, String dni) {
        Long usuarioId = usuarioRepository.findByEmail(email).orElseThrow().getId();
        jdbcTemplate.update(
                "INSERT INTO personas (usuario_id, nombre, apellido, dni) VALUES (?, ?, ?, ?)",
                usuarioId,
                "Nombre",
                "Apellido",
                dni);
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

    @Test
    void loginConDniValido_devuelve200ConJwt() {
        String email = registrarUsuario("login-dni-ok-" + UUID.randomUUID() + "@vitalys.test", "password123");
        String dni = "30" + System.nanoTime() % 1_000_000; // único por corrida, evita choque con uq de personas.dni
        crearFichaPersonaParaUsuario(email, dni);

        ResponseEntity<LoginResponse> response =
                restTemplate.postForEntity(urlBase() + "/api/auth/login", body(dni, "password123"), LoginResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getToken()).isNotBlank();
    }

    @Test
    void loginConDniDeUsuarioSinFichaEnPersonas_devuelve401() {
        // Usuario recién autorregistrado (CA-01-6): tiene `usuario` pero no fila en `personas`.
        registrarUsuario("login-sin-ficha-" + UUID.randomUUID() + "@vitalys.test", "password123");
        String dniSinFicha = "40" + System.nanoTime() % 1_000_000;

        ResponseEntity<String> response = restTemplate.postForEntity(
                urlBase() + "/api/auth/login", body(dniSinFicha, "password123"), String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void loginConDniInexistente_devuelve401IndistinguibleDeCredencialesInvalidas() {
        String dniInexistente = "99" + System.nanoTime() % 1_000_000;

        ResponseEntity<String> response = restTemplate.postForEntity(
                urlBase() + "/api/auth/login", body(dniInexistente, "cualquiera"), String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }
}
