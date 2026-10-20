package com.vitalys.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.time.OffsetDateTime;

/** Body de {@code POST /api/turnos/gym}. La franja dura 60 minutos: solo se envía el inicio. */
@Schema(description = "Reserva de una franja de gimnasio.")
public record ReservaGymRequest(
        @NotNull @Schema(example = "2026-10-26T10:00:00-03:00") OffsetDateTime inicio,
        @Schema(description = "Obligatorio si reserva un ADMIN; un socio reserva siempre para sí mismo", example = "2")
                Long personaId) {}
