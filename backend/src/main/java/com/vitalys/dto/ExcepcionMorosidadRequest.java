package com.vitalys.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

/** Body de {@code POST /api/excepciones-morosidad} (RF-30). No lleva turno: todavía no existe (RN-23). */
public record ExcepcionMorosidadRequest(
        @NotNull @Schema(example = "2") Long personaId,
        @NotBlank @Size(max = 500) @Schema(example = "Acordó plan de pago en recepción") String motivo,
        @NotNull @Schema(example = "2026-10-31") LocalDate validaHasta,
        @Schema(description = "true: habilita una sola reserva", example = "true") boolean unSoloUso) {}
