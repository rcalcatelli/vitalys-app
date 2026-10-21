package com.vitalys.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.time.LocalTime;

/** Una franja semanal de atención (RF-14). Se usa por fila y dentro del batch. */
@Schema(description = "Franja semanal recurrente de un profesional.")
public record FranjaRequest(
        @NotNull @Min(value = 1, message = "El día de la semana va de 1 (lunes) a 7 (domingo)")
                @Max(value = 7, message = "El día de la semana va de 1 (lunes) a 7 (domingo)")
                @Schema(description = "1 = lunes ... 7 = domingo", example = "1")
                Integer diaSemana,
        @NotNull @Schema(type = "string", example = "09:00") LocalTime horaInicio,
        @NotNull @Schema(type = "string", example = "13:00") LocalTime horaFin) {}
