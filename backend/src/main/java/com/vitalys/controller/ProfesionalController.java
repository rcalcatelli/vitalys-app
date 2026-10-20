package com.vitalys.controller;

import com.vitalys.domain.Usuario;
import com.vitalys.dto.DisponibilidadBatchRequest;
import com.vitalys.dto.FranjaRequest;
import com.vitalys.dto.FranjaResponse;
import com.vitalys.dto.ImpactoResponse;
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

    @GetMapping("/{id}/baja/impacto")
    @Operation(
            summary = "Impacto de la baja (paso 1)",
            description = "Turnos futuros reservados que se cancelarían al dar de baja al profesional. No modifica nada. ADMIN (RN-25).")
    public ImpactoResponse impactoDeBaja(@AuthenticationPrincipal Usuario actor, @PathVariable Long id) {
        return profesionalService.impactoDeBaja(actor, id);
    }

    @DeleteMapping("/{id}")
    @Operation(
            summary = "Baja de profesional (paso 2)",
            description = "Baja lógica: activo = false, franjas borradas y usuario deshabilitado. Sin turnos futuros se da de baja "
                    + "directamente; con turnos exige confirmar=true (409 con el impacto si falta) y los cancela en cascada, "
                    + "avisando a cada paciente. ADMIN (RN-25, RN-24).")
    public ProfesionalResponse darDeBaja(
            @AuthenticationPrincipal Usuario actor,
            @PathVariable Long id,
            @Parameter(description = "true = confirma la cancelación de los turnos afectados") @RequestParam(defaultValue = "false")
                    boolean confirmar) {
        return profesionalService.darDeBaja(actor, id, confirmar);
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
    @Operation(
            summary = "Modificar franja",
            description = "ADMIN o el propio profesional. 409 si se solapa (RN-11) o si deja turnos futuros sin cobertura "
                    + "y falta confirmar=true (el body trae el impacto, RN-24).")
    public FranjaResponse modificarFranja(
            @AuthenticationPrincipal Usuario actor,
            @PathVariable Long id,
            @PathVariable Long franjaId,
            @Valid @RequestBody FranjaRequest franja,
            @Parameter(description = "true = confirma la cancelación de los turnos afectados") @RequestParam(defaultValue = "false")
                    boolean confirmar) {
        return disponibilidadService.actualizar(actor, id, franjaId, franja, confirmar);
    }

    @DeleteMapping("/{id}/disponibilidad/{franjaId}")
    @Operation(
            summary = "Eliminar franja",
            description = "Borrado físico. ADMIN o el propio profesional. 409 con el impacto si hay turnos futuros afectados "
                    + "y falta confirmar=true (RN-24).")
    public ResponseEntity<Void> eliminarFranja(
            @AuthenticationPrincipal Usuario actor,
            @PathVariable Long id,
            @PathVariable Long franjaId,
            @Parameter(description = "true = confirma la cancelación de los turnos afectados") @RequestParam(defaultValue = "false")
                    boolean confirmar) {
        disponibilidadService.eliminar(actor, id, franjaId, confirmar);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/disponibilidad/{franjaId}/impacto")
    @Operation(
            summary = "Impacto de quitar una franja",
            description = "Turnos futuros que se cancelarían al quitar esa franja. No modifica nada. ADMIN o el propio profesional (RN-24).")
    public ImpactoResponse impactoDeQuitarFranja(
            @AuthenticationPrincipal Usuario actor, @PathVariable Long id, @PathVariable Long franjaId) {
        return disponibilidadService.impactoDeQuitar(actor, id, franjaId);
    }

    @PostMapping("/{id}/disponibilidad/impacto")
    @Operation(
            summary = "Vista previa del impacto de un conjunto de franjas",
            description = "Recibe el conjunto completo propuesto y devuelve los turnos futuros que quedarían sin "
                    + "cobertura. Es solo lectura: no modifica nada. ADMIN o el propio profesional (RN-24).")
    public ImpactoResponse impactoDeDisponibilidad(
            @AuthenticationPrincipal Usuario actor,
            @PathVariable Long id,
            @Valid @RequestBody DisponibilidadBatchRequest request) {
        return disponibilidadService.impacto(actor, id, request.franjas());
    }

    @PutMapping("/{id}/disponibilidad")
    @Operation(
            summary = "Reemplazar toda la disponibilidad",
            description = "Reemplazo total en una transacción. ADMIN o el propio profesional. 409 si alguna franja "
                    + "se solapa (RN-11): no se aplica ninguna. 409 con el impacto si deja turnos futuros sin cobertura "
                    + "y falta confirmar=true; con confirmar=true los cancela en cascada y avisa a los pacientes (RN-24).")
    public List<FranjaResponse> reemplazarDisponibilidad(
            @AuthenticationPrincipal Usuario actor,
            @PathVariable Long id,
            @Valid @RequestBody DisponibilidadBatchRequest request,
            @Parameter(description = "true = confirma la cancelación de los turnos afectados") @RequestParam(defaultValue = "false")
                    boolean confirmar) {
        return disponibilidadService.reemplazar(actor, id, request.franjas(), confirmar);
    }
}
