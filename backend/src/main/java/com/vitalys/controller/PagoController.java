package com.vitalys.controller;

import com.vitalys.domain.Usuario;
import com.vitalys.dto.PagoResponse;
import com.vitalys.dto.RegistrarPagoRequest;
import com.vitalys.service.PagoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/pagos")
@Tag(name = "Pagos", description = "Registro manual de cuotas y sesiones (Módulo 5)")
@SecurityRequirement(name = "bearerAuth")
public class PagoController {

    private final PagoService service;

    public PagoController(PagoService service) {
        this.service = service;
    }

    @PostMapping
    @Operation(
            summary = "Registrar pago",
            description = "ADMIN. Cuota mensual (periodo, día 1) o sesión de consultorio (turno), con su medio de pago.")
    public ResponseEntity<PagoResponse> registrar(
            @AuthenticationPrincipal Usuario actor, @Valid @RequestBody RegistrarPagoRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.registrar(actor, request));
    }
}
