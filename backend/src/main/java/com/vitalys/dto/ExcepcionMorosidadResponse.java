package com.vitalys.dto;

import com.vitalys.domain.ExcepcionMorosidad;
import java.time.LocalDate;

public record ExcepcionMorosidadResponse(
        Long id, Long personaId, Long autorizadoPor, String motivo, LocalDate validaHasta, boolean unSoloUso, Long turnoId) {

    public static ExcepcionMorosidadResponse de(ExcepcionMorosidad e) {
        return new ExcepcionMorosidadResponse(
                e.getId(), e.getPersonaId(), e.getAutorizadoPor(), e.getMotivo(), e.getValidaHasta(), e.isUnSoloUso(), e.getTurnoId());
    }
}
