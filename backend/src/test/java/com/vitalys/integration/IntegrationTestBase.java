package com.vitalys.integration;

import java.security.SecureRandom;
import java.util.Base64;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

/**
 * Clase base para tests de integración (design.md §8): levanta un Postgres real vía
 * Testcontainers y ejecuta {@code vitalys_ddl.sql} como init script — es la única forma de
 * validar el cast nativo {@code ?::rol_usuario} end-to-end antes de tocar Supabase. NUNCA
 * reemplazar por H2 ni por una base en memoria: el objetivo explícito es detectar acá el
 * problema de ENUM nativo, no en producción.
 *
 * <p>Ningún secreto hardcodeado: la clave de firma JWT usada en los tests se genera en runtime
 * con {@link SecureRandom}, nunca como literal en el código fuente.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
public abstract class IntegrationTestBase {

    /**
     * Patrón <em>singleton container</em> de Testcontainers: el contenedor se arranca UNA vez
     * en el bloque estático y NUNCA se detiene; lo limpia Ryuk al terminar la JVM.
     *
     * <p>NO usar {@code @Testcontainers} + {@code @Container} acá. Esa combinación, en una clase
     * base que extienden varias clases de test, detiene el contenedor al terminar cada subclase y
     * arranca otro con un puerto nuevo. Spring, en cambio, cachea el {@code ApplicationContext} y
     * evalúa {@code @DynamicPropertySource} una sola vez, así que el pool sigue apuntando al
     * puerto muerto: {@code Connection to localhost:PUERTO refused} y 30 s de timeout de Hikari
     * en toda clase que no haya corrido primero.
     */
    static final PostgreSQLContainer<?> POSTGRES =
            new PostgreSQLContainer<>(DockerImageName.parse("postgres:15-alpine")).withInitScript("vitalys_ddl.sql");

    static {
        POSTGRES.start();
    }

    private static final String JWT_TEST_SECRET = generarSecretoDeTest();

    @DynamicPropertySource
    static void registrarPropiedades(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        registry.add("vitalys.jwt.secret", () -> JWT_TEST_SECRET);
        registry.add("vitalys.jwt.expiration-ms", () -> "86400000");
    }

    private static String generarSecretoDeTest() {
        byte[] bytes = new byte[32];
        new SecureRandom().nextBytes(bytes);
        return Base64.getEncoder().encodeToString(bytes);
    }

    @LocalServerPort
    protected int port;

    @Autowired
    protected TestRestTemplate restTemplate;

    protected String urlBase() {
        return "http://localhost:" + port;
    }
}
