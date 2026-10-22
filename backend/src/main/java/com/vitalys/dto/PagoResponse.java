package com.vitalys.dto;

import com.vitalys.domain.ConceptoPago;
import com.vitalys.domain.MedioPago;
import com.vitalys.domain.Pago;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

public record PagoResponse(
        Long id,
        Long personaId,
        ConceptoPago concepto,
        BigDecimal monto,
        MedioPago medio,
        LocalDate periodo,
        Long turnoId,
        OffsetDateTime fechaPago) {

    public static PagoResponse de(Pago p) {
        return new PagoResponse(
                p.getId(), p.getPersonaId(), p.getConcepto(), p.getMonto(), p.getMedio(), p.getPeriodo(), p.getTurnoId(), p.getFechaPago());
    }
}
