package com.vitalys.controller;

import com.vitalys.domain.EstadoTurno;
import com.vitalys.domain.TipoTurno;
import com.vitalys.domain.Usuario;
import com.vitalys.dto.CancelacionRequest;
import com.vitalys.dto.FranjaGymResponse;
import com.vitalys.dto.ReservaGymRequest;
import com.vitalys.dto.TurnoResponse;
import com.vitalys.service.TurnoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Solo delega a {@link TurnoService}. */
@RestController
@RequestMapping("/api/turnos")
@Tag(name = "Turnos", description = "Reserva, cancelación y asistencia (Módulo 4, docs/02-diseno/modulos.md)")
@SecurityRequirement(name = "bearerAuth")
public class TurnoController {

    private final TurnoService turnoService;

    public TurnoController(TurnoService turnoService) {
        this.turnoService = turnoService;
    }

    @GetMapping("/gym/cupo")
    @Operation(summary = "Cupo del gimnasio por franja", description = "Grilla del día con total, ocupados y disponibles. Vacía si es domingo o feriado.")
    public List<FranjaGymResponse> cupoGym(@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fecha) {
        return turnoService.cupoGym(fecha);
    }

    @PostMapping("/gym")
    @Operation(summary = "Reservar turno de gimnasio", description = "Aplica la regla de morosidad (RN-01) y las excepciones vigentes (RN-09).")
    public ResponseEntity<TurnoResponse> reservarGym(
            @AuthenticationPrincipal Usuario actor, @Valid @RequestBody ReservaGymRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(turnoService.reservarGym(actor, request));
    }

    @GetMapping("/mis-turnos")
    @Operation(summary = "Mis turnos", description = "Turnos de la persona vinculada al usuario autenticado.")
    public List<TurnoResponse> misTurnos(@AuthenticationPrincipal Usuario actor) {
        return turnoService.misTurnos(actor);
    }

    @GetMapping
    @Operation(summary = "Listar turnos", description = "Filtros por tipo, estado, fecha y persona. ADMIN.")
    public List<TurnoResponse> listar(
            @AuthenticationPrincipal Usuario actor,
            @RequestParam(required = false) TipoTurno tipo,
            @RequestParam(required = false) EstadoTurno estado,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fecha,
            @RequestParam(required = false) Long personaId) {
        return turnoService.listar(actor, tipo, estado, fecha, personaId);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Detalle de un turno", description = "ADMIN o la persona del turno.")
    public TurnoResponse obtener(@AuthenticationPrincipal Usuario actor, @PathVariable Long id) {
        return turnoService.obtener(actor, id);
    }

    @PatchMapping("/{id}/cancelar")
    @Operation(summary = "Cancelar turno", description = "En tiempo con 24 h en consultorio o 2 h en gimnasio; el lugar se libera si se cancela antes del inicio (RN-02).")
    public TurnoResponse cancelar(
            @AuthenticationPrincipal Usuario actor, @PathVariable Long id, @Valid @RequestBody CancelacionRequest request) {
        return turnoService.cancelar(actor, id, request.motivo());
    }

    @PatchMapping("/{id}/completado")
    @Operation(summary = "Marcar completado", description = "Gimnasio: check-in por ADMIN. Consultorio: profesional a cargo o ADMIN.")
    public TurnoResponse completado(@AuthenticationPrincipal Usuario actor, @PathVariable Long id) {
        return turnoService.marcarCompletado(actor, id);
    }

    @PatchMapping("/{id}/ausente")
    @Operation(summary = "Marcar ausente", description = "Solo con el turno ya iniciado.")
    public TurnoResponse ausente(@AuthenticationPrincipal Usuario actor, @PathVariable Long id) {
        return turnoService.marcarAusente(actor, id);
    }
}
