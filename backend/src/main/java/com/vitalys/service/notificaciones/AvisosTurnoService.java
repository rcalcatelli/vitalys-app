package com.vitalys.service.notificaciones;

import com.vitalys.domain.EstadoTurno;
import com.vitalys.domain.Notificacion;
import com.vitalys.domain.Persona;
import com.vitalys.domain.Profesional;
import com.vitalys.domain.TipoNotificacion;
import com.vitalys.domain.TipoTurno;
import com.vitalys.domain.Turno;
import com.vitalys.repository.NotificacionRepository;
import com.vitalys.repository.ProfesionalRepository;
import com.vitalys.repository.TurnoRepository;
import java.time.Clock;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.util.HtmlUtils;

/**
 * Avisos al socio sobre sus propios turnos (RF-26 a RF-28): confirmación de reserva, aviso de
 * cancelación y recordatorio 24 h antes. Usa el mismo circuito que la cascada de disponibilidad:
 * la fila de {@code notificaciones} se guarda en la transacción del caso de uso y el email sale
 * después del commit por {@link DespachadorNotificaciones}, con un reintento. Un fallo de email
 * nunca revierte la reserva ni la cancelación.
 */
@Service
public class AvisosTurnoService {

    static final ZoneId ZONA = ZoneId.of("America/Argentina/Buenos_Aires");
    static final Duration ANTICIPACION_RECORDATORIO = Duration.ofHours(24);
    static final String SIN_EMAIL = "El socio no tiene email: no se pudo avisar";

    private static final DateTimeFormatter FECHA_HORA = DateTimeFormatter.ofPattern("dd/MM/yyyy 'a las' HH:mm");

    private final NotificacionRepository notificacionRepository;
    private final ProfesionalRepository profesionalRepository;
    private final TurnoRepository turnoRepository;
    private final ApplicationEventPublisher publisher;
    private final Clock clock;

    public AvisosTurnoService(
            NotificacionRepository notificacionRepository,
            ProfesionalRepository profesionalRepository,
            TurnoRepository turnoRepository,
            ApplicationEventPublisher publisher,
            Clock clock) {
        this.notificacionRepository = notificacionRepository;
        this.profesionalRepository = profesionalRepository;
        this.turnoRepository = turnoRepository;
        this.publisher = publisher;
        this.clock = clock;
    }

    /** RF-26. Se llama dentro de la transacción de la reserva. */
    @Transactional(propagation = Propagation.MANDATORY)
    public void confirmarReserva(Turno turno) {
        avisar(turno, TipoNotificacion.CONFIRMACION_TURNO,
                "Turno confirmado: " + descripcion(turno),
                "<p>Tu turno quedó reservado:</p>" + detalle(turno)
                        + "<p>Si no podés asistir, cancelalo desde la aplicación con "
                        + (turno.getTipoTurno() == TipoTurno.GYM ? "2" : "24")
                        + " horas de anticipación.</p>");
    }

    /** RF-27, cuando cancela el socio o un ADMIN. La cascada de disponibilidad (RN-24) tiene su propio aviso. */
    @Transactional(propagation = Propagation.MANDATORY)
    public void avisarCancelacion(Turno turno) {
        String tardio = turno.getEstado() == EstadoTurno.CANCELADO_TARDE
                ? "<p>La cancelación quedó registrada fuera de término.</p>"
                : "";
        avisar(turno, TipoNotificacion.AVISO_CANCELACION,
                "Turno cancelado: " + descripcion(turno),
                "<p>Se canceló tu turno:</p>" + detalle(turno) + tardio
                        + "<p>Podés reservar otro desde la aplicación.</p>");
    }

    /**
     * RF-28. Busca los turnos reservados que empiezan dentro de las próximas 24 h y no tienen
     * recordatorio, y le manda uno a cada socio. Los que se reservaron con menos de 24 h de
     * anticipación no lo reciben: la confirmación de la reserva ya cumple esa función.
     *
     * @return cantidad de recordatorios registrados
     */
    @Transactional
    public int enviarRecordatorios() {
        OffsetDateTime ahora = OffsetDateTime.now(clock);
        List<Turno> turnos = turnoRepository.buscarSinRecordatorio(
                EstadoTurno.RESERVADO, TipoNotificacion.RECORDATORIO, ahora, ahora.plus(ANTICIPACION_RECORDATORIO));
        int enviados = 0;
        for (Turno t : turnos) {
            if (t.getCreadoEn() != null && t.getCreadoEn().isAfter(t.getInicio().minus(ANTICIPACION_RECORDATORIO))) {
                continue;
            }
            avisar(t, TipoNotificacion.RECORDATORIO,
                    "Recordatorio: " + descripcion(t),
                    "<p>Te recordamos tu turno de mañana:</p>" + detalle(t)
                            + "<p>Si no podés asistir, cancelalo desde la aplicación.</p>");
            enviados++;
        }
        return enviados;
    }

    private void avisar(Turno turno, TipoNotificacion tipo, String asunto, String cuerpo) {
        OffsetDateTime ahora = OffsetDateTime.now(clock);
        Persona persona = turno.getPersona();
        String email = persona.getUsuario().getEmail();
        boolean sinEmail = email == null || email.isBlank();

        Notificacion notificacion = Notificacion.pendiente(persona, turno, tipo, sinEmail ? "" : email, ahora);
        if (sinEmail) {
            // Nace definitiva: nadie puede enviarla y el ADMIN la ve en la alerta de fallidas.
            for (int i = 0; i < Notificacion.MAX_INTENTOS; i++) {
                notificacion.registrarFallo(ahora, SIN_EMAIL);
            }
            notificacionRepository.save(notificacion);
            return;
        }
        notificacionRepository.save(notificacion);
        String html = "<p>Hola " + HtmlUtils.htmlEscape(persona.getNombre()) + ",</p>" + cuerpo;
        publisher.publishEvent(new NotificacionPorEnviar(notificacion.getId(), asunto, html));
    }

    private String descripcion(Turno turno) {
        String cuando = FECHA_HORA.format(turno.getInicio().atZoneSameInstant(ZONA));
        return (turno.getTipoTurno() == TipoTurno.GYM ? "gimnasio" : "consulta con " + profesional(turno)) + ", " + cuando;
    }

    private String detalle(Turno turno) {
        return "<ul><li>" + HtmlUtils.htmlEscape(descripcion(turno)) + " hs</li></ul>";
    }

    private String profesional(Turno turno) {
        return profesionalRepository
                .findById(turno.getProfesionalId())
                .map((Profesional p) -> p.getNombre() + " " + p.getApellido())
                .orElse("el profesional");
    }
}
