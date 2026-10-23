package com.vitalys.dto;

import com.vitalys.domain.EstadoTurno;
import com.vitalys.domain.TipoTurno;
import com.vitalys.domain.Turno;
import java.time.OffsetDateTime;
import java.time.ZoneId;

/**
 * Vista de un turno, con los horarios expresados en hora argentina. {@code personaDni} es null
 * salvo en {@link #paraAdmin}: el DNI solo se expone donde el diseño lo pide (listado del ADMIN).
 */
public record TurnoResponse(
        Long id,
        Long personaId,
        String persona,
        String personaNombre,
        String personaApellido,
        String personaDni,
        TipoTurno tipoTurno,
        Long profesionalId,
        OffsetDateTime inicio,
        OffsetDateTime fin,
        EstadoTurno estado,
        OffsetDateTime completadoEn,
        OffsetDateTime canceladoEn,
        String motivoCancelacion) {

    private static final ZoneId ZONA = ZoneId.of("America/Argentina/Buenos_Aires");

    public static TurnoResponse de(Turno t) {
        return armar(t, null);
    }

    /** Vista para el ADMIN: incluye el DNI de la persona. */
    public static TurnoResponse paraAdmin(Turno t) {
        return armar(t, t.getPersona().getDni());
    }

    private static TurnoResponse armar(Turno t, String dni) {
        return new TurnoResponse(
                t.getId(),
                t.getPersona().getId(),
                t.getPersona().getApellido() + ", " + t.getPersona().getNombre(),
                t.getPersona().getNombre(),
                t.getPersona().getApellido(),
                dni,
                t.getTipoTurno(),
                t.getProfesionalId(),
                local(t.getInicio()),
                local(t.getFin()),
                t.getEstado(),
                local(t.getCompletadoEn()),
                local(t.getCanceladoEn()),
                t.getMotivoCancelacion());
    }

    private static OffsetDateTime local(OffsetDateTime instante) {
        return instante == null ? null : instante.atZoneSameInstant(ZONA).toOffsetDateTime();
    }
}
