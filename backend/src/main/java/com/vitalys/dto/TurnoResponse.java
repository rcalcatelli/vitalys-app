package com.vitalys.dto;

import com.vitalys.domain.EstadoTurno;
import com.vitalys.domain.TipoTurno;
import com.vitalys.domain.Turno;
import java.time.OffsetDateTime;
import java.time.ZoneId;

/** Vista de un turno, con los horarios expresados en hora argentina. */
public record TurnoResponse(
        Long id,
        Long personaId,
        String persona,
        TipoTurno tipoTurno,
        Long profesionalId,
        OffsetDateTime inicio,
        OffsetDateTime fin,
        EstadoTurno estado,
        OffsetDateTime canceladoEn,
        String motivoCancelacion) {

    private static final ZoneId ZONA = ZoneId.of("America/Argentina/Buenos_Aires");

    public static TurnoResponse de(Turno t) {
        return new TurnoResponse(
                t.getId(),
                t.getPersona().getId(),
                t.getPersona().getApellido() + ", " + t.getPersona().getNombre(),
                t.getTipoTurno(),
                t.getProfesionalId(),
                local(t.getInicio()),
                local(t.getFin()),
                t.getEstado(),
                local(t.getCanceladoEn()),
                t.getMotivoCancelacion());
    }

    private static OffsetDateTime local(OffsetDateTime instante) {
        return instante == null ? null : instante.atZoneSameInstant(ZONA).toOffsetDateTime();
    }
}
