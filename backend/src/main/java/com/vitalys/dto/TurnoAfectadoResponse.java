package com.vitalys.dto;

import com.vitalys.domain.Turno;
import java.time.OffsetDateTime;

/** Un turno futuro que se cancelaría (RN-24): lo que el ADMIN o el profesional necesita ver antes de confirmar. */
public record TurnoAfectadoResponse(
        Long turnoId, Long personaId, String paciente, OffsetDateTime inicio, OffsetDateTime fin) {

    public static TurnoAfectadoResponse de(Turno t) {
        return new TurnoAfectadoResponse(
                t.getId(),
                t.getPersona().getId(),
                t.getPersona().getNombre() + " " + t.getPersona().getApellido(),
                t.getInicio(),
                t.getFin());
    }
}
