package com.vitalys.controller;

import com.vitalys.domain.Usuario;
import com.vitalys.dto.ProfesionalAltaRequest;
import com.vitalys.dto.ProfesionalDatosRequest;
import com.vitalys.dto.ProfesionalResponse;
import com.vitalys.service.ProfesionalService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Solo delega a {@link ProfesionalService}: la autorización por rol vive en el servicio (RNF-03). */
@RestController
@RequestMapping("/api/profesionales")
@Tag(name = "Profesionales", description = "ABM de profesionales con baja lógica (Módulo 3, docs/02-diseno/modulos.md)")
@SecurityRequirement(name = "bearerAuth")
public class ProfesionalController {

    private final ProfesionalService profesionalService;

    public ProfesionalController(ProfesionalService profesionalService) {
        this.profesionalService = profesionalService;
    }

    @GetMapping
    @Operation(summary = "Listar profesionales", description = "Filtro opcional por estado. ADMIN (RF-12).")
    public List<ProfesionalResponse> listar(
            @AuthenticationPrincipal Usuario actor,
            @Parameter(description = "true = solo activos, false = solo dados de baja") @RequestParam(required = false)
                    Boolean activo) {
        return profesionalService.listar(actor, activo);
    }

    @GetMapping("/me")
    @Operation(
            summary = "Mi ficha de profesional",
            description = "El profesional autenticado. 404 si el usuario no tiene un profesional asociado.")
    public ProfesionalResponse miPerfil(@AuthenticationPrincipal Usuario actor) {
        return profesionalService.miPerfil(actor);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Obtener un profesional", description = "ADMIN, o el propio profesional.")
    public ProfesionalResponse obtener(@AuthenticationPrincipal Usuario actor, @PathVariable Long id) {
        return profesionalService.obtener(actor, id);
    }

    @PostMapping
    @Operation(
            summary = "Alta de profesional",
            description = "Crea usuario PROFESIONAL (con contraseña inicial) y profesional en una sola operación. ADMIN (RF-11).")
    public ResponseEntity<ProfesionalResponse> crear(
            @AuthenticationPrincipal Usuario actor, @Valid @RequestBody ProfesionalAltaRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(profesionalService.crear(actor, request));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Actualizar datos", description = "Nombre, apellido, especialidad y duración del turno. ADMIN (RF-13).")
    public ProfesionalResponse actualizar(
            @AuthenticationPrincipal Usuario actor,
            @PathVariable Long id,
            @Valid @RequestBody ProfesionalDatosRequest datos) {
        return profesionalService.actualizar(actor, id, datos);
    }

    @DeleteMapping("/{id}")
    @Operation(
            summary = "Baja de profesional",
            description = "Baja lógica: activo = false, franjas borradas y usuario deshabilitado. 409 si tiene turnos futuros "
                    + "reservados (la cancelación en cascada llega en un cambio posterior). ADMIN (RN-25).")
    public ProfesionalResponse darDeBaja(@AuthenticationPrincipal Usuario actor, @PathVariable Long id) {
        return profesionalService.darDeBaja(actor, id);
    }
}
