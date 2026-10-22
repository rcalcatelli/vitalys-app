package com.vitalys.controller;

import com.vitalys.domain.EstadoPersona;
import com.vitalys.domain.Usuario;
import com.vitalys.dto.PersonaAltaRequest;
import com.vitalys.dto.PersonaDatosRequest;
import com.vitalys.dto.PersonaResponse;
import com.vitalys.dto.PersonaVinculoRequest;
import com.vitalys.service.PersonaService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Solo delega a {@link PersonaService}: la autorización por rol vive en el servicio (RNF-03). */
@RestController
@RequestMapping("/api/personas")
@Tag(name = "Personas", description = "ABM de socios y pacientes con baja lógica (Módulo 2, docs/02-diseno/modulos.md)")
@SecurityRequirement(name = "bearerAuth")
public class PersonaController {

    private final PersonaService personaService;

    public PersonaController(PersonaService personaService) {
        this.personaService = personaService;
    }

    @GetMapping
    @Operation(summary = "Listar personas", description = "Filtros por estado, texto (nombre, apellido o DNI) y socios del gimnasio. ADMIN (RF-06).")
    public List<PersonaResponse> listar(
            @AuthenticationPrincipal Usuario actor,
            @RequestParam(required = false) EstadoPersona estado,
            @Parameter(description = "Nombre, apellido o DNI") @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "false") boolean soloGym) {
        return personaService.listar(actor, estado, q, soloGym);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Obtener una persona", description = "ADMIN, o la propia persona.")
    public PersonaResponse obtener(@AuthenticationPrincipal Usuario actor, @PathVariable Long id) {
        return personaService.obtener(actor, id);
    }

    @PostMapping
    @Operation(summary = "Alta presencial", description = "Crea usuario SOCIO_PACIENTE y persona en una sola operación. ADMIN (RF-05).")
    public ResponseEntity<PersonaResponse> crear(
            @AuthenticationPrincipal Usuario actor, @Valid @RequestBody PersonaAltaRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(personaService.crear(actor, request));
    }

    @PostMapping("/vincular")
    @Operation(summary = "Vincular usuario existente", description = "Crea la ficha de una persona para un usuario que ya se registró, buscándolo por email; sin contraseña. ADMIN (RF-31). 403 antes de resolver el email; 404 si no existe; 409 si ya está vinculado.")
    public ResponseEntity<PersonaResponse> vincular(
            @AuthenticationPrincipal Usuario actor, @Valid @RequestBody PersonaVinculoRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(personaService.vincular(actor, request));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Actualizar datos", description = "ADMIN (RF-07). El DNI sigue siendo único.")
    public PersonaResponse actualizar(
            @AuthenticationPrincipal Usuario actor,
            @PathVariable Long id,
            @Valid @RequestBody PersonaDatosRequest datos) {
        return personaService.actualizar(actor, id, datos);
    }

    @PatchMapping("/{id}/baja")
    @Operation(summary = "Baja lógica", description = "estado → INACTIVO y fecha_baja = hoy. ADMIN.")
    public PersonaResponse darDeBaja(@AuthenticationPrincipal Usuario actor, @PathVariable Long id) {
        return personaService.darDeBaja(actor, id);
    }

    @PatchMapping("/{id}/reactivar")
    @Operation(summary = "Reactivar", description = "estado → ACTIVO y se limpia fecha_baja. ADMIN.")
    public PersonaResponse reactivar(@AuthenticationPrincipal Usuario actor, @PathVariable Long id) {
        return personaService.reactivar(actor, id);
    }
}
