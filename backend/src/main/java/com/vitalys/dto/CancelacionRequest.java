package com.vitalys.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Body de {@code PATCH /api/turnos/{id}/cancelar}. El motivo queda registrado (trazabilidad). */
public record CancelacionRequest(
        @NotBlank @Size(max = 500) @Schema(example = "Me surgió un viaje") String motivo) {}
