package com.vitalys.dto;

import com.vitalys.domain.Turno;
import java.util.List;

/** Turnos futuros que quedan afuera de la disponibilidad propuesta. Vacío = el cambio no cancela nada. */
public record ImpactoResponse(int cantidad, List<TurnoAfectadoResponse> turnos) {

    public static ImpactoResponse de(List<Turno> afectados) {
        return new ImpactoResponse(
                afectados.size(), afectados.stream().map(TurnoAfectadoResponse::de).toList());
    }

    public boolean hayImpacto() {
        return cantidad > 0;
    }
}
