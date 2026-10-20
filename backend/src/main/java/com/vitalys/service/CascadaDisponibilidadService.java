package com.vitalys.service;

import com.vitalys.domain.Notificacion;
import com.vitalys.domain.Persona;
import com.vitalys.domain.Profesional;
import com.vitalys.domain.TipoNotificacion;
import com.vitalys.domain.Turno;
import com.vitalys.domain.Usuario;
import com.vitalys.dto.FranjaRequest;
import com.vitalys.dto.ImpactoResponse;
import com.vitalys.exception.ConfirmacionRequeridaException;
import com.vitalys.repository.NotificacionRepository;
import com.vitalys.repository.TurnoRepository;
import com.vitalys.service.notificaciones.NotificacionPorEnviar;
import java.time.Clock;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.util.HtmlUtils;

/**
 * Cancelación en cascada (RN-24 / RN-25). No abre su propia transacción lógica: corre dentro de la
 * del llamador, que ya tomó el lock del profesional, de modo que turnos cancelados, cambio de
 * disponibilidad y filas de notificación se confirman o se revierten juntos.
 *
 * <p>Los emails NO se envían acá: se publica un {@link NotificacionPorEnviar} por paciente y el
 * despachador lo recibe recién después del commit. Un fallo de email jamás revierte la cascada.
 */
@Service
public class CascadaDisponibilidadService {

    private static final DateTimeFormatter FECHA_HORA = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    private static final String SIN_EMAIL = "El paciente no tiene email: no se pudo avisar";

    private final TurnoRepository turnoRepository;
    private final NotificacionRepository notificacionRepository;
    private final ApplicationEventPublisher publisher;
    private final Clock clock;

    public CascadaDisponibilidadService(
            TurnoRepository turnoRepository,
            NotificacionRepository notificacionRepository,
            ApplicationEventPublisher publisher,
            Clock clock) {
        this.turnoRepository = turnoRepository;
        this.notificacionRepository = notificacionRepository;
        this.publisher = publisher;
        this.clock = clock;
    }

    /** Turnos futuros del profesional que quedarían sin cobertura con {@code nuevas}. No modifica nada. */
    @Transactional(readOnly = true)
    public List<Turno> afectados(Long profesionalId, List<FranjaRequest> nuevas) {
        OffsetDateTime ahora = OffsetDateTime.now(clock);
        return ImpactoCalculator.afectados(
                turnoRepository.futurosReservadosDeConsultorio(profesionalId, ahora), nuevas, ahora);
    }

    @Transactional(readOnly = true)
    public ImpactoResponse impacto(Long profesionalId, List<FranjaRequest> nuevas) {
        return ImpactoResponse.de(afectados(profesionalId, nuevas));
    }

    /**
     * Sin impacto no hace nada. Con impacto y sin {@code confirmar} corta con 409 llevando la lista;
     * con confirmación cancela los turnos y avisa a cada paciente.
     *
     * @return los turnos cancelados (vacío si no había impacto)
     */
    @Transactional
    public ImpactoResponse resolver(
            Usuario actor, Profesional profesional, List<FranjaRequest> nuevas, boolean confirmar, String motivo) {
        List<Turno> afectados = afectados(profesional.getId(), nuevas);
        ImpactoResponse impacto = ImpactoResponse.de(afectados);
        if (afectados.isEmpty()) {
            return impacto;
        }
        if (!confirmar) {
            throw new ConfirmacionRequeridaException(
                    "El cambio cancelaría " + afectados.size() + " turno(s) futuro(s): confirmá con confirmar=true",
                    impacto);
        }
        cancelar(actor, profesional, afectados, motivo);
        return impacto;
    }

    private void cancelar(Usuario actor, Profesional profesional, List<Turno> afectados, String motivo) {
        OffsetDateTime ahora = OffsetDateTime.now(clock);
        afectados.forEach(t -> t.cancelarPorProfesional(ahora, actor.getId(), motivo));
        turnoRepository.saveAllAndFlush(afectados);

        Map<Long, List<Turno>> porPaciente = new LinkedHashMap<>();
        for (Turno t : afectados) {
            porPaciente
                    .computeIfAbsent(t.getPersona().getId(), id -> new java.util.ArrayList<>())
                    .add(t);
        }
        porPaciente.values().forEach(turnos -> avisar(profesional, turnos, ahora));
    }

    /** Una notificación por paciente, sin importar cuántos turnos pierda (el primero, el más cercano, la ancla). */
    private void avisar(Profesional profesional, List<Turno> turnos, OffsetDateTime ahora) {
        Turno primero = turnos.get(0); // la consulta viene ordenada por inicio
        Persona paciente = primero.getPersona();
        String email = paciente.getUsuario().getEmail();
        boolean sinEmail = email == null || email.isBlank();

        Notificacion notificacion = Notificacion.pendiente(
                paciente, primero, TipoNotificacion.AVISO_CANCELACION, sinEmail ? "" : email, ahora);
        if (sinEmail) {
            // Nace ya fallida y definitiva: nadie va a poder enviarla y el ADMIN debe verla en la alerta.
            for (int i = 0; i < Notificacion.MAX_INTENTOS; i++) {
                notificacion.registrarFallo(ahora, SIN_EMAIL);
            }
            notificacionRepository.save(notificacion);
            return;
        }
        notificacionRepository.save(notificacion);
        publisher.publishEvent(new NotificacionPorEnviar(
                notificacion.getId(), asunto(profesional, turnos), cuerpo(profesional, paciente, turnos)));
    }

    private static String asunto(Profesional profesional, List<Turno> turnos) {
        return (turnos.size() == 1 ? "Se canceló tu turno con " : "Se cancelaron tus turnos con ")
                + profesional.getNombre() + " " + profesional.getApellido();
    }

    private static String cuerpo(Profesional profesional, Persona paciente, List<Turno> turnos) {
        StringBuilder html = new StringBuilder();
        html.append("<p>Hola ").append(HtmlUtils.htmlEscape(paciente.getNombre())).append(",</p>");
        html.append("<p>Lamentamos avisarte que ")
                .append(HtmlUtils.htmlEscape(profesional.getNombre() + " " + profesional.getApellido()))
                .append(" modificó su disponibilidad y se ")
                .append(turnos.size() == 1 ? "canceló el siguiente turno" : "cancelaron los siguientes turnos")
                .append(":</p><ul>");
        for (Turno t : turnos) {
            html.append("<li>")
                    .append(FECHA_HORA.format(t.getInicio().atZoneSameInstant(ImpactoCalculator.ZONA)))
                    .append(" hs</li>");
        }
        html.append("</ul><p>Podés reservar un nuevo turno desde la aplicación. Disculpá las molestias.</p>");
        return html.toString();
    }
}
