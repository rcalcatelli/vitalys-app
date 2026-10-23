package com.vitalys.service.notificaciones;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * RF-28: cada hora busca los turnos que empiezan en las próximas 24 h y les manda el
 * recordatorio. Como la ventana es "lo que falta para las próximas 24 h" y la marca es la fila
 * de {@code notificaciones}, si el servicio estuvo dormido (RG-14) la primera corrida al
 * despertar pone al día lo atrasado sin duplicar avisos.
 */
@Component
public class JobRecordatorios {

    private static final Logger log = LoggerFactory.getLogger(JobRecordatorios.class);

    private final AvisosTurnoService avisos;

    public JobRecordatorios(AvisosTurnoService avisos) {
        this.avisos = avisos;
    }

    @Scheduled(cron = "${vitalys.turnos.recordatorios-cron:0 5 * * * *}", zone = "America/Argentina/Buenos_Aires")
    public void ejecutar() {
        int enviados = avisos.enviarRecordatorios();
        if (enviados > 0) {
            log.info("Recordatorios de turno registrados: {}", enviados);
        }
    }
}
