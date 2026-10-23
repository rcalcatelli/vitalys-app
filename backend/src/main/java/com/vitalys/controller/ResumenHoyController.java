package com.vitalys.controller;

import com.vitalys.domain.Usuario;
import com.vitalys.dto.ResumenHoyResponse;
import com.vitalys.service.ResumenHoyService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Tag(name = "Panel del ADMIN", description = "Hoy en el centro")
@SecurityRequirement(name = "bearerAuth")
public class ResumenHoyController {

    private final ResumenHoyService service;

    public ResumenHoyController(ResumenHoyService service) {
        this.service = service;
    }

    @GetMapping("/api/admin/resumen-hoy")
    @Operation(summary = "Resumen del día", description = "Ocupación del gimnasio por franja, turnos de hoy y socios con períodos impagos. ADMIN.")
    public ResumenHoyResponse resumen(@AuthenticationPrincipal Usuario actor) {
        return service.resumen(actor);
    }
}
