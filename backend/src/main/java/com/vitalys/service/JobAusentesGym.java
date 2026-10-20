package com.vitalys.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * RF-35: al cerrar cada franja, los turnos de gimnasio sin check-in pasan a AUSENTE. Corre un
 * minuto después de cada hora en punto. Como la consulta toma "todo lo que ya terminó", si el
 * servicio estuvo dormido (RG-14) la primera corrida al despertar pone al día lo atrasado.
 */
@Component
public class JobAusentesGym {

    private static final Logger log = LoggerFactory.getLogger(JobAusentesGym.class);

    private final TurnoService turnoService;

    public JobAusentesGym(TurnoService turnoService) {
        this.turnoService = turnoService;
    }

    @Scheduled(cron = "${vitalys.turnos.ausentes-cron:0 1 * * * *}", zone = "America/Argentina/Buenos_Aires")
    public void ejecutar() {
        int marcados = turnoService.marcarAusentesVencidos();
        if (marcados > 0) {
            log.info("Turnos de gimnasio marcados como AUSENTE: {}", marcados);
        }
    }
}
