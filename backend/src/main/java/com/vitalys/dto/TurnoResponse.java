package com.vitalys.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.vitalys.domain.EstadoTurno;
import com.vitalys.domain.TipoTurno;
import com.vitalys.domain.Turno;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.Objects;

/**
 * Vista de un turno, con los horarios expresados en hora argentina. {@code personaDni} es null
 * salvo en {@link #paraAdmin}: el DNI solo se expone donde el diseño lo pide (listado del ADMIN).
 *
 * <p>{@code reservadoPorRecepcion}/{@code canceladoPorRecepcion} (RN-27, D8): el turno lo reservó o
 * lo canceló alguien que no es el dueño (Recepción, también durante "Operar como"). Es solo una
 * marca: nunca expone quién fue.
 */
public record TurnoResponse(
        Long id,
        Long personaId,
        String persona,
        String personaNombre,
        String personaApellido,
        @JsonInclude(JsonInclude.Include.NON_NULL) String personaDni,
        TipoTurno tipoTurno,
        Long profesionalId,
        OffsetDateTime inicio,
        OffsetDateTime fin,
        EstadoTurno estado,
        OffsetDateTime completadoEn,
        OffsetDateTime canceladoEn,
        String motivoCancelacion,
        boolean reservadoPorRecepcion,
        boolean canceladoPorRecepcion) {

    private static final ZoneId ZONA = ZoneId.of("America/Argentina/Buenos_Aires");

    public static TurnoResponse de(Turno t) {
        return armar(t, null);
    }

    /** Vista para el ADMIN: incluye el DNI de la persona. */
    public static TurnoResponse paraAdmin(Turno t) {
        return armar(t, t.getPersona().getDni());
    }

    private static TurnoResponse armar(Turno t, String dni) {
        Long duenio = t.getPersona().getUsuario() == null ? null : t.getPersona().getUsuario().getId();
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
                t.getMotivoCancelacion(),
                !Objects.equals(t.getReservadoPorUsuarioId(), duenio),
                (t.getEstado() == EstadoTurno.CANCELADO_EN_TIEMPO || t.getEstado() == EstadoTurno.CANCELADO_TARDE)
                        && !Objects.equals(t.getCanceladoPorUsuarioId(), duenio));
    }

    private static OffsetDateTime local(OffsetDateTime instante) {
        return instante == null ? null : instante.atZoneSameInstant(ZONA).toOffsetDateTime();
    }
}
