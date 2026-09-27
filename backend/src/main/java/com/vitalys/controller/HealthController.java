package com.vitalys.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Liveness check público, sin dependencia de base de datos (specs/health-check/spec.md). Cierra
 * el criterio de cierre de Sprint 1.
 */
@RestController
@Tag(name = "Health", description = "Liveness check técnico de infraestructura, no pertenece a un módulo de negocio")
public class HealthController {

    @GetMapping("/api/health")
    @Operation(summary = "Liveness check", description = "Público, sin dependencia de base de datos. Usado por el HEALTHCHECK de Docker.")
    @ApiResponse(responseCode = "200", description = "El servicio está arriba")
    public Map<String, String> health() {
        return Map.of("status", "UP");
    }
}
