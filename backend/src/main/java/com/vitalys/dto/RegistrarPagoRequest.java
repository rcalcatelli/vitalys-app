package com.vitalys.dto;

import com.vitalys.domain.ConceptoPago;
import com.vitalys.domain.MedioPago;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * El DTO solo valida la forma. Que una cuota lleve periodo (día 1) y no turno, y que una sesión
 * lleve turno y no periodo, lo decide el motor ({@code chk_concepto_datos}); por eso ni
 * {@code periodo} ni {@code turnoId} son obligatorios acá ni se normalizan.
 */
public record RegistrarPagoRequest(
        @NotNull Long personaId,
        @NotNull ConceptoPago concepto,
        @NotNull @Positive BigDecimal monto,
        @NotNull MedioPago medio,
        LocalDate periodo,
        Long turnoId) {}
