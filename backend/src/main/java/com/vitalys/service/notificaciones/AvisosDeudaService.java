package com.vitalys.service.notificaciones;

import com.vitalys.domain.EstadoPersona;
import com.vitalys.domain.Notificacion;
import com.vitalys.domain.Persona;
import com.vitalys.domain.TipoNotificacion;
import com.vitalys.repository.NotificacionRepository;
import com.vitalys.repository.PersonaRepository;
import com.vitalys.repository.PersonaSpecifications;
import com.vitalys.service.MorosidadService;
import com.vitalys.service.MorosidadService.EstadoDeuda;
import java.time.Clock;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.util.HtmlUtils;

/**
 * RF-37: avisa por email al socio de gimnasio cada vez que un período mensual pasa a impago,
 * antes de que llegue la suspensión (RN-01, estado "con deuda"). Mientras la deuda está por debajo
 * del umbral el aviso es {@code AVISO_DEUDA} y dice cuántos períodos faltan; al alcanzarlo es
 * {@code AVISO_SUSPENSION}.
 *
 * <p>La marca es el período impago más reciente, guardado en {@code notificaciones.periodo}: un
 * aviso por período, garantizado por {@code uq_aviso_deuda_periodo} (V15). Un socio con varios
 * meses atrasados recibe uno solo, el del último. El envío usa el mismo circuito que los avisos
 * de turnos: fila en la transacción y email después del commit, con un reintento.
 */
@Service
public class AvisosDeudaService {

    static final String SIN_EMAIL = "El socio no tiene email: no se pudo avisar";

    private static final DateTimeFormatter MES = DateTimeFormatter.ofPattern("MMMM 'de' yyyy", Locale.forLanguageTag("es-AR"));

    private final PersonaRepository personaRepository;
    private final MorosidadService morosidadService;
    private final NotificacionRepository notificacionRepository;
    private final ApplicationEventPublisher publisher;
    private final Clock clock;

    public AvisosDeudaService(
            PersonaRepository personaRepository,
            MorosidadService morosidadService,
            NotificacionRepository notificacionRepository,
            ApplicationEventPublisher publisher,
            Clock clock) {
        this.personaRepository = personaRepository;
        this.morosidadService = morosidadService;
        this.notificacionRepository = notificacionRepository;
        this.publisher = publisher;
        this.clock = clock;
    }

    /** @return cantidad de avisos registrados en esta corrida */
    @Transactional
    public int avisarDeudas() {
        List<Persona> socios = personaRepository.findAll(
                PersonaSpecifications.conEstado(EstadoPersona.ACTIVO).and(PersonaSpecifications.soloSociosGym(true)),
                Sort.by("id"));
        int avisos = 0;
        for (Persona socio : socios) {
            Optional<LocalDate> periodo = morosidadService.ultimoPeriodoImpago(socio);
            if (periodo.isEmpty() || notificacionRepository.existsByPersonaIdAndPeriodo(socio.getId(), periodo.get())) {
                continue;
            }
            avisar(socio, periodo.get(), morosidadService.evaluar(socio));
            avisos++;
        }
        return avisos;
    }

    private void avisar(Persona socio, LocalDate periodo, EstadoDeuda deuda) {
        OffsetDateTime ahora = OffsetDateTime.now(clock);
        TipoNotificacion tipo = deuda.suspendido() ? TipoNotificacion.AVISO_SUSPENSION : TipoNotificacion.AVISO_DEUDA;
        String email = socio.getUsuario().getEmail();
        boolean sinEmail = email == null || email.isBlank();

        Notificacion notificacion = Notificacion.deDeuda(socio, tipo, sinEmail ? "" : email, periodo, ahora);
        if (sinEmail) {
            for (int i = 0; i < Notificacion.MAX_INTENTOS; i++) {
                notificacion.registrarFallo(ahora, SIN_EMAIL);
            }
            notificacionRepository.save(notificacion);
            return;
        }
        notificacionRepository.save(notificacion);
        publisher.publishEvent(new NotificacionPorEnviar(notificacion.getId(), asunto(deuda), cuerpo(socio, periodo, deuda)));
    }

    static String asunto(EstadoDeuda deuda) {
        return deuda.suspendido()
                ? "Tu reserva de gimnasio quedó suspendida"
                : "Tenés " + deuda.periodosImpagos() + (deuda.periodosImpagos() == 1 ? " cuota impaga" : " cuotas impagas");
    }

    static String cuerpo(Persona socio, LocalDate periodo, EstadoDeuda deuda) {
        StringBuilder html = new StringBuilder();
        html.append("<p>Hola ").append(HtmlUtils.htmlEscape(socio.getNombre())).append(",</p>");
        html.append("<p>No registramos el pago de la cuota de gimnasio de ")
                .append(MES.format(periodo))
                .append(". En total tenés ")
                .append(deuda.periodosImpagos())
                .append(deuda.periodosImpagos() == 1 ? " período impago.</p>" : " períodos impagos.</p>");
        if (deuda.suspendido()) {
            html.append("<p>Alcanzaste el límite de ")
                    .append(deuda.umbral())
                    .append(" períodos, así que por ahora no podés reservar turnos de gimnasio. ")
                    .append("Tus turnos de consultorio no cambian. Para volver a reservar, regularizá la cuota en ")
                    .append("recepción o consultá por una excepción.</p>");
        } else {
            int restantes = deuda.umbral() - deuda.periodosImpagos();
            html.append("<p>Podés seguir reservando con normalidad. Si llegás a ")
                    .append(deuda.umbral())
                    .append(" períodos impagos, la reserva de gimnasio se suspende")
                    .append(restantes == 1 ? " (te falta 1)" : " (te faltan " + restantes + ")")
                    .append(".</p>");
        }
        return html.toString();
    }
}
