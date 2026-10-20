package com.vitalys.config;

import com.vitalys.service.notificaciones.BrevoNotificadorEmail;
import com.vitalys.service.notificaciones.LogNotificadorEmail;
import com.vitalys.service.notificaciones.NotificadorEmail;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.web.client.RestClient;

/**
 * Elige el adaptador de {@link NotificadorEmail} según {@code vitalys.email.proveedor}: el log es
 * el default (dev y tests no salen a la red); {@code brevo} se activa explícitamente.
 * {@code @EnableAsync} habilita el despacho fuera del hilo del request; usa el executor acotado de
 * Spring Boot (ver {@code spring.task.execution.*}).
 */
@Configuration
@EnableAsync
public class EmailConfig {

    @Bean
    @ConditionalOnProperty(name = "vitalys.email.proveedor", havingValue = "log", matchIfMissing = true)
    public NotificadorEmail logNotificadorEmail() {
        return new LogNotificadorEmail();
    }

    @Bean
    @ConditionalOnProperty(name = "vitalys.email.proveedor", havingValue = "brevo")
    public NotificadorEmail brevoNotificadorEmail(EmailProperties propiedades) {
        EmailProperties.Brevo brevo = propiedades.getBrevo();
        if (brevo.getApiKey() == null || brevo.getApiKey().isBlank()
                || brevo.getRemitenteEmail() == null || brevo.getRemitenteEmail().isBlank()) {
            throw new IllegalStateException(
                    "vitalys.email.proveedor=brevo requiere BREVO_API_KEY y BREVO_REMITENTE_EMAIL");
        }
        SimpleClientHttpRequestFactory fabrica = new SimpleClientHttpRequestFactory();
        fabrica.setConnectTimeout(brevo.getTimeout());
        fabrica.setReadTimeout(brevo.getTimeout());
        return new BrevoNotificadorEmail(brevo, RestClient.builder().requestFactory(fabrica).build());
    }
}
