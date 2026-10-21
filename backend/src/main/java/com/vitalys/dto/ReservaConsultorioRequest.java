package com.vitalys.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.time.OffsetDateTime;

/** Body de {@code POST /api/turnos}. El fin lo define la duración de turno del profesional. */
@Schema(description = "Reserva de un turno de consultorio.")
public record ReservaConsultorioRequest(
        @NotNull @Schema(example = "1") Long profesionalId,
        @NotNull @Schema(example = "2026-10-28T09:00:00-03:00") OffsetDateTime inicio,
        @Schema(description = "Obligatorio si reserva un ADMIN; un socio reserva siempre para sí mismo", example = "2")
                Long personaId) {}
