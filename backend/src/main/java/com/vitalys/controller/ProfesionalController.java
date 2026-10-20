package com.vitalys.controller;

import com.vitalys.domain.Usuario;
import com.vitalys.dto.DisponibilidadBatchRequest;
import com.vitalys.dto.FranjaRequest;
import com.vitalys.dto.FranjaResponse;
import com.vitalys.dto.ProfesionalAltaRequest;
import com.vitalys.dto.ProfesionalDatosRequest;
import com.vitalys.dto.ProfesionalResponse;
import com.vitalys.service.DisponibilidadService;
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

/** Solo delega a {@link ProfesionalService} y {@link DisponibilidadService}: la autorización por rol vive en el servicio (RNF-03). */
@RestController
@RequestMapping("/api/profesionales")
@Tag(name = "Profesionales", description = "ABM de profesionales con baja lógica (Módulo 3, docs/02-diseno/modulos.md)")
@SecurityRequirement(name = "bearerAuth")
public class ProfesionalController {

    private final ProfesionalService profesionalService;
    private final DisponibilidadService disponibilidadService;

    public ProfesionalController(ProfesionalService profesionalService, DisponibilidadService disponibilidadService) {
        this.profesionalService = profesionalService;
        this.disponibilidadService = disponibilidadService;
    }

    @GetMapping
    @Operation(summary = "Listar profesionales", description = "Cualquier usuario autenticado. El filtro por estado y el email son solo del ADMIN; el resto ve "
                    + "únicamente profesionales activos, sin email (RF-12).")
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
    @Operation(summary = "Obtener un profesional", description = "Cualquier usuario autenticado; el email solo lo ven el ADMIN y el propio profesional.")
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

    @GetMapping("/{id}/disponibilidad")
    @Operation(summary = "Franjas de un profesional", description = "Cualquier usuario autenticado.")
    public List<FranjaResponse> franjas(@PathVariable Long id) {
        return disponibilidadService.listar(id);
    }

    @PostMapping("/{id}/disponibilidad")
    @Operation(
            summary = "Agregar franja",
            description = "ADMIN o el propio profesional. 409 si se solapa con otra del mismo día (RN-11).")
    public ResponseEntity<FranjaResponse> agregarFranja(
            @AuthenticationPrincipal Usuario actor, @PathVariable Long id, @Valid @RequestBody FranjaRequest franja) {
        return ResponseEntity.status(HttpStatus.CREATED).body(disponibilidadService.crear(actor, id, franja));
    }

    @PutMapping("/{id}/disponibilidad/{franjaId}")
    @Operation(summary = "Modificar franja", description = "ADMIN o el propio profesional. 409 si se solapa (RN-11).")
    public FranjaResponse modificarFranja(
            @AuthenticationPrincipal Usuario actor,
            @PathVariable Long id,
            @PathVariable Long franjaId,
            @Valid @RequestBody FranjaRequest franja) {
        return disponibilidadService.actualizar(actor, id, franjaId, franja);
    }

    @DeleteMapping("/{id}/disponibilidad/{franjaId}")
    @Operation(summary = "Eliminar franja", description = "Borrado físico. ADMIN o el propio profesional.")
    public ResponseEntity<Void> eliminarFranja(
            @AuthenticationPrincipal Usuario actor, @PathVariable Long id, @PathVariable Long franjaId) {
        disponibilidadService.eliminar(actor, id, franjaId);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/disponibilidad")
    @Operation(
            summary = "Reemplazar toda la disponibilidad",
            description = "Reemplazo total en una transacción. ADMIN o el propio profesional. 409 si alguna franja "
                    + "se solapa (RN-11): no se aplica ninguna.")
    public List<FranjaResponse> reemplazarDisponibilidad(
            @AuthenticationPrincipal Usuario actor,
            @PathVariable Long id,
            @Valid @RequestBody DisponibilidadBatchRequest request) {
        return disponibilidadService.reemplazar(actor, id, request.franjas());
    }
}
