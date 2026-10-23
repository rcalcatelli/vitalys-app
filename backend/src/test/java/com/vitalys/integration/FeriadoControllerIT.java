package com.vitalys.integration;

import static org.assertj.core.api.Assertions.assertThat;

import com.sun.net.httpserver.HttpServer;
import com.vitalys.domain.Feriado;
import com.vitalys.domain.RolUsuario;
import com.vitalys.domain.TipoFeriado;
import com.vitalys.domain.Usuario;
import com.vitalys.dto.LoginResponse;
import com.vitalys.repository.FeriadoRepository;
import com.vitalys.repository.UsuarioRepository;
import java.io.IOException;
import java.io.OutputStream;
import java.io.UncheckedIOException;
import java.net.InetSocketAddress;
import java.time.LocalDate;
import java.time.Year;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

/**
 * Los dos endpoints de feriados (RF-38) contra Postgres real: el listado por año que consume la
 * pantalla de reserva y la sincronización forzada por el ADMIN.
 *
 * <p>La fuente oficial NO se consulta: {@code vitalys.feriados.url-plantilla} apunta a un servidor
 * local que sirve el fixture {@code feriados-2026-oficial.json} (o responde 500, según el test).
 * La matriz de roles de la sincronización incluye el 403 de PI-06; el resto no tiene PI propio en
 * {@code definicion-pruebas.md}.
 */
class FeriadoControllerIT extends IntegrationTestBase {

    private static final String CLAVE = "Admin1234!";
    private static final int ANIO_DE_PRUEBA = 2041;

    private static final AtomicBoolean FUENTE_CAIDA = new AtomicBoolean(false);
    private static final HttpServer FUENTE = levantarFuente();

    private static HttpServer levantarFuente() {
        try (var entrada = FeriadoControllerIT.class.getResourceAsStream("/feriados-2026-oficial.json")) {
            assertThat(entrada).as("fixture del calendario oficial 2026").isNotNull();
            byte[] fixture = entrada.readAllBytes();

            HttpServer servidor = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
            servidor.createContext("/", intercambio -> {
                if (FUENTE_CAIDA.get()) {
                    intercambio.sendResponseHeaders(500, -1);
                    intercambio.close();
                    return;
                }
                intercambio.getResponseHeaders().add("Content-Type", "application/json");
                intercambio.sendResponseHeaders(200, fixture.length);
                try (OutputStream salida = intercambio.getResponseBody()) {
                    salida.write(fixture);
                }
            });
            servidor.start();
            return servidor;
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    @DynamicPropertySource
    static void apuntarFuenteAlServidorLocal(DynamicPropertyRegistry registry) {
        registry.add(
                "vitalys.feriados.url-plantilla",
                () -> "http://127.0.0.1:" + FUENTE.getAddress().getPort() + "/holidays-{anio}-es.json");
    }

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private FeriadoRepository feriadoRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @AfterEach
    void restaurarFuente() {
        FUENTE_CAIDA.set(false);
    }

    // ------------------------------------------------------------------ GET /api/feriados

    @Test
    void listar_sinToken_devuelve401() {
        ResponseEntity<String> r = restTemplate.getForEntity(urlBase() + "/api/feriados", String.class);

        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void listar_cualquierRolAutenticadoPuedeConsultar() {
        for (RolUsuario rol : RolUsuario.values()) {
            ResponseEntity<String> r = llamar(HttpMethod.GET, "/api/feriados", tokenDe(rol), String.class);

            assertThat(r.getStatusCode()).as("rol %s", rol).isEqualTo(HttpStatus.OK);
        }
    }

    @Test
    void listar_conAnio_devuelveSoloEseAnioOrdenadoYConTodosLosCampos() {
        feriadoRepository.save(Feriado.manual(
                LocalDate.of(ANIO_DE_PRUEBA, 7, 9), "Independencia (prueba)", TipoFeriado.INAMOVIBLE, true));
        feriadoRepository.save(Feriado.manual(
                LocalDate.of(ANIO_DE_PRUEBA, 3, 3), "Cierre por mantenimiento", TipoFeriado.NO_LABORABLE, false));
        feriadoRepository.save(Feriado.manual(
                LocalDate.of(ANIO_DE_PRUEBA + 1, 1, 1), "Otro año", TipoFeriado.INAMOVIBLE, true));

        ResponseEntity<List<Map<String, Object>>> r =
                listar("?anio=" + ANIO_DE_PRUEBA, tokenDe(RolUsuario.SOCIO_PACIENTE));

        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(r.getBody()).hasSize(2);
        assertThat(r.getBody().get(0))
                .containsEntry("fecha", ANIO_DE_PRUEBA + "-03-03")
                .containsEntry("descripcion", "Cierre por mantenimiento")
                .containsEntry("tipo", "NO_LABORABLE")
                .containsEntry("cierraGimnasio", false)
                .containsEntry("origen", "MANUAL");
        assertThat(r.getBody().get(1))
                .containsEntry("fecha", ANIO_DE_PRUEBA + "-07-09")
                .containsEntry("tipo", "INAMOVIBLE")
                .containsEntry("cierraGimnasio", true);
    }

    @Test
    void listar_anioSinFeriados_devuelveListaVacia() {
        ResponseEntity<List<Map<String, Object>>> r = listar("?anio=2099", tokenDe(RolUsuario.ADMIN));

        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(r.getBody()).isEmpty();
    }

    @Test
    void listar_sinAnio_usaElAnioEnCurso() {
        ResponseEntity<List<Map<String, Object>>> r = listar("", tokenDe(RolUsuario.SOCIO_PACIENTE));

        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.OK);
        String anio = String.valueOf(Year.now().getValue());
        assertThat(r.getBody()).allSatisfy(f -> assertThat((String) f.get("fecha")).startsWith(anio));
    }

    @Test
    void listar_anioNoNumerico_devuelve400() {
        ResponseEntity<String> r =
                llamar(HttpMethod.GET, "/api/feriados?anio=abc", tokenDe(RolUsuario.ADMIN), String.class);

        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    // ------------------------------------------------------------------ POST /api/admin/feriados/sincronizar

    @Test
    void sincronizar_sinToken_devuelve401() {
        ResponseEntity<String> r = restTemplate.exchange(
                urlBase() + "/api/admin/feriados/sincronizar", HttpMethod.POST, HttpEntity.EMPTY, String.class);

        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void sincronizar_rolesQueNoSonAdmin_devuelve403() {
        for (RolUsuario rol : List.of(RolUsuario.SOCIO_PACIENTE, RolUsuario.PROFESIONAL)) {
            ResponseEntity<String> r =
                    llamar(HttpMethod.POST, "/api/admin/feriados/sincronizar", tokenDe(rol), String.class);

            assertThat(r.getStatusCode()).as("rol %s", rol).isEqualTo(HttpStatus.FORBIDDEN);
        }
    }

    @Test
    void sincronizar_admin_fuenteDisponible_devuelve200ConElResumen() {
        ResponseEntity<Map<String, Object>> r = sincronizar();

        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat((List<?>) r.getBody().get("errores")).isEmpty();
        assertThat((List<?>) r.getBody().get("anios")).hasSize(2);
        int procesados = (int) r.getBody().get("altas")
                + (int) r.getBody().get("modificaciones")
                + (int) r.getBody().get("sinCambios");
        assertThat(procesados).isPositive();
    }

    @Test
    void sincronizar_admin_fuenteCaida_devuelve207ConLosErroresYDejaElCalendarioIntacto() {
        feriadoRepository.save(Feriado.manual(
                LocalDate.of(ANIO_DE_PRUEBA, 5, 5), "Manual que debe sobrevivir", TipoFeriado.NO_LABORABLE, true));
        long antes = feriadoRepository.count();
        FUENTE_CAIDA.set(true);

        ResponseEntity<Map<String, Object>> r = sincronizar();

        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.MULTI_STATUS);
        assertThat((List<?>) r.getBody().get("errores")).hasSize(2);
        assertThat(feriadoRepository.count()).isEqualTo(antes);
    }

    // ------------------------------------------------------------------ auxiliares

    private ResponseEntity<Map<String, Object>> sincronizar() {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(tokenDe(RolUsuario.ADMIN));
        return restTemplate.exchange(
                urlBase() + "/api/admin/feriados/sincronizar",
                HttpMethod.POST,
                new HttpEntity<>(headers),
                new ParameterizedTypeReference<>() {});
    }

    private ResponseEntity<List<Map<String, Object>>> listar(String query, String token) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        return restTemplate.exchange(
                urlBase() + "/api/feriados" + query,
                HttpMethod.GET,
                new HttpEntity<>(headers),
                new ParameterizedTypeReference<>() {});
    }

    private <T> ResponseEntity<T> llamar(HttpMethod metodo, String ruta, String token, Class<T> tipo) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        return restTemplate.exchange(urlBase() + ruta, metodo, new HttpEntity<>(headers), tipo);
    }

    private String tokenDe(RolUsuario rol) {
        String email = "fer-" + UUID.randomUUID() + "@vitalys.test";
        usuarioRepository.save(new Usuario(email, passwordEncoder.encode(CLAVE), rol));
        return restTemplate
                .postForEntity(
                        urlBase() + "/api/auth/login",
                        Map.of("identificador", email, "contrasena", CLAVE),
                        LoginResponse.class)
                .getBody()
                .getToken();
    }
}
