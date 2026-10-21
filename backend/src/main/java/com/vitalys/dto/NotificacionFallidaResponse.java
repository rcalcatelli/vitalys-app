package com.vitalys.dto;

import com.vitalys.domain.Notificacion;
import com.vitalys.domain.Persona;
import com.vitalys.domain.Turno;
import com.vitalys.domain.TipoNotificacion;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;

/**
 * Fila de la alerta "Notificaciones fallidas" del ADMIN. {@code tipo} es {@code DEFINITIVA}
 * (falló dos veces) o {@code HUERFANA} (quedó en curso y nunca se resolvió). Los datos del turno
 * son null si la notificación no está asociada a uno.
 */
public record NotificacionFallidaResponse(
        Long id,
        String tipo,
        TipoNotificacion tipoNotificacion,
        Long personaId,
        String pacienteNombre,
        String pacienteEmail,
        Long turnoId,
        Long profesionalId,
        String profesionalNombre,
        LocalDate fecha,
        LocalTime hora,
        String detalleError,
        int intentos,
        OffsetDateTime ultimoIntentoEn,
        OffsetDateTime enviadoEn) {

    public static final String DEFINITIVA = "DEFINITIVA";
    public static final String HUERFANA = "HUERFANA";

    public static NotificacionFallidaResponse de(Notificacion n, String profesionalNombre, Clock clock) {
        Persona persona = n.getPersona();
        Turno turno = n.getTurno();
        OffsetDateTime inicio = turno == null ? null : turno.getInicio().atZoneSameInstant(clock.getZone()).toOffsetDateTime();
        return new NotificacionFallidaResponse(
                n.getId(),
                n.esDefinitiva() ? DEFINITIVA : HUERFANA,
                n.getTipo(),
                persona.getId(),
                persona.getNombre() + " " + persona.getApellido(),
                n.getEmailDestino(),
                turno == null ? null : turno.getId(),
                turno == null ? null : turno.getProfesionalId(),
                profesionalNombre,
                inicio == null ? null : inicio.toLocalDate(),
                inicio == null ? null : inicio.toLocalTime(),
                n.getDetalleError(),
                n.getIntentos(),
                n.getUltimoIntentoEn(),
                n.getEnviadoEn());
    }
}
