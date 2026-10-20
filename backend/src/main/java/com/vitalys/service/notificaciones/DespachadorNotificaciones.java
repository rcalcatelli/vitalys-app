package com.vitalys.service.notificaciones;

import com.vitalys.config.EmailProperties;
import com.vitalys.domain.Notificacion;
import com.vitalys.repository.NotificacionRepository;
import java.time.Clock;
import java.time.OffsetDateTime;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Envía el email de una notificación ya confirmada en base y reintenta UNA vez si falla.
 *
 * <p><b>Un fallo de email nunca revierte nada.</b> Corre después del commit y en otro hilo
 * ({@code @Async}): el cambio de negocio que originó el aviso (por ejemplo, la cancelación de
 * turnos) ya es definitivo, y cualquier excepción acá se captura y se registra en la fila.
 *
 * <p>El reintento es en memoria, con un {@link TaskScheduler} y un delay configurable
 * ({@code vitalys.email.reintento-delay}). Si el proceso se cae entre el 1.º y el 2.º intento, la
 * fila queda huérfana y la detecta el listado de fallidas por antigüedad; no hay barrido al
 * arrancar, para no duplicar envíos.
 */
@Component
public class DespachadorNotificaciones {

    private static final Logger log = LoggerFactory.getLogger(DespachadorNotificaciones.class);

    private final NotificacionRepository repository;
    private final NotificadorEmail notificador;
    private final TaskScheduler scheduler;
    private final EmailProperties propiedades;
    private final Clock clock;

    public DespachadorNotificaciones(
            NotificacionRepository repository,
            NotificadorEmail notificador,
            TaskScheduler scheduler,
            EmailProperties propiedades,
            Clock clock) {
        this.repository = repository;
        this.notificador = notificador;
        this.scheduler = scheduler;
        this.propiedades = propiedades;
        this.clock = clock;
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void alConfirmarTransaccion(NotificacionPorEnviar evento) {
        despachar(evento);
    }

    /** Primer intento. Público para poder dispararlo sin transacción (tests, reenvíos futuros). */
    public void despachar(NotificacionPorEnviar evento) {
        intentar(evento);
    }

    private void intentar(NotificacionPorEnviar evento) {
        try {
            Notificacion notificacion = repository.findById(evento.notificacionId()).orElse(null);
            if (notificacion == null) {
                log.warn("Notificación {} inexistente; no se envía", evento.notificacionId());
                return;
            }
            if (notificacion.isExitoso() || notificacion.esDefinitiva()) {
                return;
            }

            boolean fallo = false;
            try {
                notificador.enviar(notificacion.getEmailDestino(), evento.asunto(), evento.contenidoHtml());
                notificacion.registrarExito(OffsetDateTime.now(clock));
            } catch (RuntimeException e) {
                fallo = true;
                notificacion.registrarFallo(OffsetDateTime.now(clock), e.getMessage());
                log.warn(
                        "Falló el envío de la notificación {} (intento {}): {}",
                        notificacion.getId(),
                        notificacion.getIntentos(),
                        e.getMessage());
            }
            repository.save(notificacion);

            if (fallo && !notificacion.esDefinitiva()) {
                scheduler.schedule(() -> intentar(evento), clock.instant().plus(propiedades.getReintentoDelay()));
            }
        } catch (RuntimeException e) {
            // Última barrera: ni siquiera la persistencia del resultado puede propagarse.
            log.error("Error despachando la notificación {}", evento.notificacionId(), e);
        }
    }
}
