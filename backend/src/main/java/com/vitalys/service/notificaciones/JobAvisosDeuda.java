package com.vitalys.service.notificaciones;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * RF-37: una vez por día revisa la deuda de los socios del gimnasio y avisa los períodos que
 * pasaron a impago. Un período vence con día de precisión, así que una corrida diaria alcanza; si
 * el servicio estuvo dormido, la próxima corrida avisa lo pendiente sin duplicar (V15).
 */
@Component
public class JobAvisosDeuda {

    private static final Logger log = LoggerFactory.getLogger(JobAvisosDeuda.class);

    private final AvisosDeudaService avisos;

    public JobAvisosDeuda(AvisosDeudaService avisos) {
        this.avisos = avisos;
    }

    @Scheduled(cron = "${vitalys.notificaciones.deuda-cron:0 0 9 * * *}", zone = "America/Argentina/Buenos_Aires")
    public void ejecutar() {
        int registrados = avisos.avisarDeudas();
        if (registrados > 0) {
            log.info("Avisos de deuda registrados: {}", registrados);
        }
    }
}
