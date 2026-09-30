package com.vitalys.service.feriados;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Corrida programada de la sincronización del calendario de feriados (RF-38).
 *
 * <p>Todos los días a las 03:00 de Argentina. La hora no es caprichosa: es la franja sin tráfico,
 * y un decreto publicado durante el día queda cargado antes de que alguien intente reservar a la
 * mañana siguiente.
 *
 * <p><strong>Por qué hace falta que sea diario.</strong> El calendario argentino cambia después de
 * publicado: los trasladables se corren por decreto anual y pueden declararse feriados nuevos en
 * cualquier momento — en 2026, el 09/11 por la visita papal. Una carga única queda vieja sin que
 * nadie se entere, y el gimnasio termina vendiendo turnos para un día en que no abre.
 *
 * <p><strong>El job nunca es el camino crítico.</strong> La reserva de un turno lee la tabla
 * {@code feriados}, no la API. Una caída de la fuente degrada la frescura del calendario, no la
 * capacidad de reservar. Y un fallo del job no puede tumbar el scheduler: se registra y se espera
 * a la corrida siguiente.
 *
 * <p>Si hace falta forzarla —un feriado declarado hoy que no puede esperar a las 03:00— el ADMIN
 * dispone de {@code POST /api/admin/feriados/sincronizar}.
 */
@Component
@ConditionalOnProperty(name = "vitalys.feriados.habilitado", havingValue = "true", matchIfMissing = true)
public class JobSincronizacionFeriados {

    private static final Logger log = LoggerFactory.getLogger(JobSincronizacionFeriados.class);

    private final SincronizadorFeriados sincronizador;

    public JobSincronizacionFeriados(SincronizadorFeriados sincronizador) {
        this.sincronizador = sincronizador;
    }

    /** Corrida diaria. Por defecto 03:00 America/Argentina/Buenos_Aires. */
    @Scheduled(cron = "${vitalys.feriados.cron}", zone = "${vitalys.feriados.zona}")
    public void corridaDiaria() {
        log.info("Sincronización programada del calendario de feriados");

        try {
            ResultadoSincronizacion resultado = sincronizador.sincronizar();
            if (!resultado.exitoso()) {
                log.error(
                        "Sincronización de feriados incompleta; el calendario de esos años quedó como estaba: {}",
                        resultado.errores());
            }
        } catch (RuntimeException e) {
            // Una excepción que escape acá dejaría al scheduler sin volver a programar la tarea.
            log.error("Falló la sincronización de feriados; el calendario queda como estaba", e);
        }
    }
}
