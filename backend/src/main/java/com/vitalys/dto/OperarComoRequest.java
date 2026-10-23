package com.vitalys.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

/** Body de {@code POST /api/admin/operar-como} (RF-39). */
@Schema(description = "Persona (socio) en cuyo nombre va a operar Recepción.")
public record OperarComoRequest(@NotNull @Schema(example = "12") Long personaId) {}
