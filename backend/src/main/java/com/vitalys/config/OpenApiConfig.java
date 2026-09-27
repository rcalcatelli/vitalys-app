package com.vitalys.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Metadatos y esquema de seguridad de la documentación OpenAPI (Swagger UI), servida en
 * {@code /swagger-ui/index.html} y {@code /v3/api-docs}. Habilitada tanto en {@code dev} como en
 * {@code prod} (ver {@code application.properties}): la tutora evalúa el backend desplegado y
 * tener la documentación viva ahí suma; el tradeoff es exponer públicamente la forma de la API en
 * producción, aceptado porque no revela secretos ni datos — apagarla es cambiar
 * {@code springdoc.swagger-ui.enabled} / {@code springdoc.api-docs.enabled} de {@code true} a
 * {@code false} en una sola línea.
 *
 * <p>El esquema {@code bearerAuth} se declara acá (no en cada {@code @Operation}) y se aplica
 * globalmente como {@link SecurityRequirement}, para poder probar {@code GET /api/auth/me} desde
 * la propia UI pegando el JWT devuelto por {@code /api/auth/login} en el botón "Authorize".
 */
@Configuration
public class OpenApiConfig {

    private static final String BEARER_SCHEME_NAME = "bearerAuth";

    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
                .info(apiInfo())
                .components(new Components().addSecuritySchemes(BEARER_SCHEME_NAME, bearerScheme()))
                .addSecurityItem(new SecurityRequirement().addList(BEARER_SCHEME_NAME));
    }

    private Info apiInfo() {
        return new Info()
                .title("Vitalys App — API")
                .description(
                        "API REST del backend de Vitalys, sistema de gestión híbrido para centro de salud "
                                + "(gimnasio + consultorios de Nutrición, Psicología y Kinesiología). "
                                + "Trabajo Final Integrador — Tecnicatura Universitaria en Programación, UTN, 2026. "
                                + "Documenta los endpoints IMPLEMENTADOS; el diseño completo de los seis módulos "
                                + "está en docs/02-diseno/modulos.md.")
                .version("v1")
                .contact(apiContact());
    }

    private Contact apiContact() {
        return new Contact().name("Renzo Calcatelli · Pablo Basualdo Arcati").url("https://github.com/rcalcatelli/vitalys-app");
    }

    private SecurityScheme bearerScheme() {
        return new SecurityScheme()
                .name(BEARER_SCHEME_NAME)
                .type(SecurityScheme.Type.HTTP)
                .scheme("bearer")
                .bearerFormat("JWT")
                .description("Token JWT devuelto por POST /api/auth/registro o POST /api/auth/login. "
                        + "Pegar solo el token, sin el prefijo \"Bearer \".");
    }
}
