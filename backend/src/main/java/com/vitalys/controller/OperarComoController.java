package com.vitalys.controller;

import com.vitalys.domain.Usuario;
import com.vitalys.dto.OperarComoRequest;
import com.vitalys.dto.OperarComoResponse;
import com.vitalys.service.OperarComoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/** Solo delega a {@link OperarComoService}: la autorización por rol vive en el servicio (RNF-03). */
@RestController
@Tag(name = "Operar como", description = "Recepción opera en nombre de un socio, con sesión acotada y auditada (RF-39)")
@SecurityRequirement(name = "bearerAuth")
public class OperarComoController {

    private final OperarComoService operarComoService;

    public OperarComoController(OperarComoService operarComoService) {
        this.operarComoService = operarComoService;
    }

    @PostMapping("/api/admin/operar-como")
    @Operation(
            summary = "Iniciar Operar como",
            description = "Solo ADMIN con sesión normal, sobre un socio activo con ficha. Devuelve una credencial "
                    + "de 30 minutos, no renovable. Queda auditado (RN-26, RN-27).")
    public OperarComoResponse iniciar(@AuthenticationPrincipal Usuario actor, @Valid @RequestBody OperarComoRequest request) {
        return operarComoService.iniciar(actor, request.personaId());
    }

    @PostMapping("/api/operar-como/fin")
    @Operation(
            summary = "Terminar Operar como",
            description = "Con la credencial de Operar como. Audita el fin y la credencial deja de autenticar.")
    public ResponseEntity<Void> terminar() {
        operarComoService.terminar();
        return ResponseEntity.noContent().build();
    }
}
