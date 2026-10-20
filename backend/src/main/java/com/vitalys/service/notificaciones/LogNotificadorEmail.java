package com.vitalys.service.notificaciones;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/** Adaptador por defecto: no envía nada, deja constancia en el log. */
public class LogNotificadorEmail implements NotificadorEmail {

    private static final Logger log = LoggerFactory.getLogger(LogNotificadorEmail.class);

    @Override
    public void enviar(String destino, String asunto, String contenidoHtml) {
        log.info("[email simulado] para={} asunto='{}'", destino, asunto);
    }
}
