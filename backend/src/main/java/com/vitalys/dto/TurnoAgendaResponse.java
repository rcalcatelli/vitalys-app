package com.vitalys.dto;

import com.vitalys.domain.EstadoTurno;
import com.vitalys.domain.Turno;
import java.time.OffsetDateTime;

/**
 * Turno de la agenda del profesional. Es la única vista que expone el DNI del paciente, para que
 * lo identifique en el consultorio; por eso es un registro aparte y no un campo de {@link TurnoResponse}.
 */
public record TurnoAgendaResponse(
        Long id,
        Long personaId,
        String persona,
        String pacienteDni,
        OffsetDateTime inicio,
        OffsetDateTime fin,
        EstadoTurno estado) {

    public static TurnoAgendaResponse de(Turno t) {
        TurnoResponse base = TurnoResponse.de(t);
        return new TurnoAgendaResponse(
                base.id(),
                base.personaId(),
                base.persona(),
                t.getPersona().getDni(),
                base.inicio(),
                base.fin(),
                base.estado());
    }
}
