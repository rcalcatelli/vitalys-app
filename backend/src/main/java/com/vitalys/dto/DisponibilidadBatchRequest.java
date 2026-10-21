package com.vitalys.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.util.List;

/** Body de {@code PUT /api/profesionales/{id}/disponibilidad}: reemplazo total de las franjas. */
@Schema(description = "Conjunto completo de franjas; reemplaza a las existentes. Vacío = sin disponibilidad.")
public record DisponibilidadBatchRequest(@NotNull @Valid List<@NotNull @Valid FranjaRequest> franjas) {}
