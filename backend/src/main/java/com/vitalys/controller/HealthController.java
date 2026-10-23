package com.vitalys.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Liveness check público, sin dependencia de base de datos (specs/health-check/spec.md). Cierra
 * el criterio de cierre de Sprint 1.
 *
 * <p>Informa además qué commit está corriendo. Render expone {@code RENDER_GIT_COMMIT} en tiempo
 * de ejecución; sin esa variable (local, CI) la versión es {@code local}. Sirve para detectar un
 * frontend nuevo hablando con un backend viejo, que fue lo que dejó en blanco Personas después
 * del merge de la PR #33.
 */
@RestController
@Tag(name = "Health", description = "Liveness check técnico de infraestructura, no pertenece a un módulo de negocio")
public class HealthController {

    private static final int LARGO_COMMIT_CORTO = 7;

    private final String version;

    public HealthController(@Value("${RENDER_GIT_COMMIT:local}") String commit) {
        this.version = commit.length() > LARGO_COMMIT_CORTO ? commit.substring(0, LARGO_COMMIT_CORTO) : commit;
    }

    @GetMapping("/api/health")
    @Operation(summary = "Liveness check", description = "Público, sin dependencia de base de datos. Usado por el HEALTHCHECK de Docker. Incluye el commit desplegado.")
    @ApiResponse(responseCode = "200", description = "El servicio está arriba")
    public Map<String, String> health() {
        return Map.of("status", "UP", "version", version);
    }
}
