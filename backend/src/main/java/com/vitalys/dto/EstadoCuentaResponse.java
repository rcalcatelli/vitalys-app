package com.vitalys.dto;

import com.vitalys.domain.MedioPago;
import com.vitalys.service.MorosidadService.EstadoPeriodo;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

/**
 * Estado de cuenta de una persona (RF-14 / CA-06-2). {@code suspendido} es el veredicto efectivo
 * de la reserva: deuda al umbral y sin excepción vigente. {@code excepcion} solo viene si una
 * excepción vigente la habilita a pesar de la deuda.
 */
public record EstadoCuentaResponse(
        Long personaId,
        String nombreCompleto,
        boolean esSocioGym,
        LocalDate fechaInicioMembresia,
        int periodosImpagos,
        int umbral,
        boolean suspendido,
        ExcepcionInfo excepcion,
        List<PeriodoDto> periodos,
        List<SesionDto> sesiones,
        Totales totales) {

    public record ExcepcionInfo(LocalDate validaHasta, String motivo) {}

    public record PagoDto(Long id, BigDecimal monto, MedioPago medio, OffsetDateTime fechaPago) {}

    public record PeriodoDto(LocalDate periodo, LocalDate vence, LocalDate limite, EstadoPeriodo estado, PagoDto pago) {}

    public record SesionDto(
            Long pagoId, Long turnoId, OffsetDateTime fechaTurno, BigDecimal monto, MedioPago medio, OffsetDateTime fechaPago) {}

    public record Totales(int cantidadPagos, BigDecimal montoTotal) {}
}
