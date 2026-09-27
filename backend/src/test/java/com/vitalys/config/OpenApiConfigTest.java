package com.vitalys.config;

import static org.assertj.core.api.Assertions.assertThat;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.junit.jupiter.api.Test;

/**
 * Unit test del bean de OpenAPI (sin contexto Spring, como {@code JwtServiceTest}). Verifica que
 * la documentación de Swagger tenga los metadatos y el esquema de seguridad correctos — no que
 * springdoc funcione (eso lo cubre la verificación manual de /v3/api-docs, no un test unitario).
 */
class OpenApiConfigTest {

    private final OpenApiConfig openApiConfig = new OpenApiConfig();

    @Test
    void customOpenAPI_declaraMetadatosDelApi() {
        OpenAPI openAPI = openApiConfig.customOpenAPI();

        assertThat(openAPI.getInfo()).isNotNull();
        assertThat(openAPI.getInfo().getTitle()).isEqualTo("Vitalys App — API");
        assertThat(openAPI.getInfo().getVersion()).isEqualTo("v1");
        assertThat(openAPI.getInfo().getDescription()).isNotBlank();
        assertThat(openAPI.getInfo().getContact()).isNotNull();
        assertThat(openAPI.getInfo().getContact().getName()).contains("Calcatelli", "Basualdo Arcati");
    }

    @Test
    void customOpenAPI_declaraEsquemaDeSeguridadBearerJwt() {
        OpenAPI openAPI = openApiConfig.customOpenAPI();

        assertThat(openAPI.getComponents()).isNotNull();
        SecurityScheme bearerAuth = openAPI.getComponents().getSecuritySchemes().get("bearerAuth");

        assertThat(bearerAuth).isNotNull();
        assertThat(bearerAuth.getType()).isEqualTo(SecurityScheme.Type.HTTP);
        assertThat(bearerAuth.getScheme()).isEqualTo("bearer");
        assertThat(bearerAuth.getBearerFormat()).isEqualTo("JWT");
    }

    @Test
    void customOpenAPI_aplicaElRequisitoDeSeguridadGlobalmente() {
        OpenAPI openAPI = openApiConfig.customOpenAPI();

        assertThat(openAPI.getSecurity()).isNotEmpty();
        assertThat(openAPI.getSecurity().get(0)).containsKey("bearerAuth");
    }
}
