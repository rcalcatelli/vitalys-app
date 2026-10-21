package com.vitalys.dto;

import com.vitalys.domain.Especialidad;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Body de {@code PUT /api/profesionales/{id}} (RF-13). El estado no se edita acá: la baja tiene su endpoint. */
@Schema(description = "Datos editables de un profesional.")
public record ProfesionalDatosRequest(
        @NotBlank @Size(max = 100) @Schema(example = "Valentina") String nombre,
        @NotBlank @Size(max = 100) @Schema(example = "Méndez") String apellido,
        @NotNull @Schema(example = "NUTRICION") Especialidad especialidad,
        @NotNull @Min(value = 1, message = "La duración del turno debe ser positiva")
                @Max(value = 240, message = "La duración del turno no puede superar las 4 horas")
                @Schema(description = "Minutos por turno", example = "30")
                Integer duracionTurnoMinutos) {}
