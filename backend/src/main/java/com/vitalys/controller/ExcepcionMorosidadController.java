package com.vitalys.controller;

import com.vitalys.domain.Usuario;
import com.vitalys.dto.ExcepcionMorosidadRequest;
import com.vitalys.dto.ExcepcionMorosidadResponse;
import com.vitalys.service.ExcepcionMorosidadService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/excepciones-morosidad")
@Tag(name = "Excepciones de morosidad", description = "Levantar puntualmente la suspensión de un socio (Módulo 4b)")
@SecurityRequirement(name = "bearerAuth")
public class ExcepcionMorosidadController {

    private final ExcepcionMorosidadService service;

    public ExcepcionMorosidadController(ExcepcionMorosidadService service) {
        this.service = service;
    }

    @PostMapping
    @Operation(summary = "Registrar excepción", description = "ADMIN. Sin turno: el turno todavía no existe (RN-23).")
    public ResponseEntity<ExcepcionMorosidadResponse> crear(
            @AuthenticationPrincipal Usuario actor, @Valid @RequestBody ExcepcionMorosidadRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.crear(actor, request));
    }

    @GetMapping("/persona/{id}")
    @Operation(summary = "Excepciones de una persona", description = "Vigentes e históricas. ADMIN.")
    public List<ExcepcionMorosidadResponse> listar(@AuthenticationPrincipal Usuario actor, @PathVariable Long id) {
        return service.listarPorPersona(actor, id);
    }
}
