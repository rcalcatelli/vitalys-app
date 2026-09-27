package com.vitalys.controller;

import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Liveness check público, sin dependencia de base de datos (specs/health-check/spec.md). Cierra
 * el criterio de cierre de Sprint 1.
 */
@RestController
public class HealthController {

    @GetMapping("/api/health")
    public Map<String, String> health() {
        return Map.of("status", "UP");
    }
}
