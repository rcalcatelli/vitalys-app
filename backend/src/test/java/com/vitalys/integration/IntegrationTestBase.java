package com.vitalys.integration;

import jakarta.annotation.PostConstruct;
import java.security.SecureRandom;
import java.util.Base64;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

/**
 * Clase base para tests de integración (design.md §8): levanta un Postgres real vía
 * Testcontainers y deja que Flyway construya el esquema corriendo las migraciones versionadas
 * de {@code db/migration} — el mismo mecanismo que usa la app en Docker/producción, así que
 * acá también se ejercitan las migraciones — para validar el cast nativo
 * {@code ?::rol_usuario} end-to-end antes de tocar Supabase. NUNCA reemplazar por H2 ni por una
 * base en memoria: el objetivo explícito es detectar acá el problema de ENUM nativo, no en
 * producción.
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
            new PostgreSQLContainer<>(DockerImageName.parse("postgres:15-alpine"));

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

    /**
     * {@code TestRestTemplate} usa por defecto {@link SimpleClientHttpRequestFactory}, que
     * envía el body de un POST en <em>modo streaming</em> (adaptador delgado sobre
     * {@code HttpURLConnection}). Ante una respuesta 401, la JDK intenta reintentar la
     * request con autenticación — pero el body ya se envió en streaming y no se puede
     * releer, así que tira {@code ResourceAccessException: cannot retry due to server
     * authentication, in streaming mode} antes de que el test llegue a leer el status code.
     *
     * <p>Por eso los tests de login con credenciales inválidas (POST + body) fallaban acá
     * mientras que los 401 de rutas GET sin body (ej. {@code AuthMeIT}, {@code SecurityIT})
     * pasaban sin problema: sin body no hay streaming, y sin streaming no hay reintento. El
     * servidor siempre devolvió 401 correctamente — esto es un problema del cliente HTTP de
     * test, no de {@code GlobalExceptionHandler} ni de la app. Desactivar el streaming acá
     * hace que el request se bufferee entero antes de enviarse, evitando el reintento. NO
     * sacar esta configuración pensando que "no hace nada": sin ella, cualquier test que
     * dispare una respuesta de error contra un POST con body vuelve a fallar por esta causa
     * ajena a la lógica de negocio.
     */
    @PostConstruct
    void desactivarOutputStreamingParaEvitarReintentoEnErrores() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setOutputStreaming(false);
        restTemplate.getRestTemplate().setRequestFactory(factory);
    }

    protected String urlBase() {
        return "http://localhost:" + port;
    }
}
