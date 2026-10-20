package com.vitalys.service.notificaciones;

import com.vitalys.config.EmailProperties;
import java.util.List;
import java.util.Map;
import org.springframework.http.MediaType;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

/**
 * Envía por la API transaccional de Brevo ({@code POST /v3/smtp/email}, header {@code api-key}).
 * HTTP y no SMTP porque Render free bloquea los puertos SMTP salientes.
 */
public class BrevoNotificadorEmail implements NotificadorEmail {

    private static final int MAX_CUERPO_ERROR = 300;

    private final EmailProperties.Brevo config;
    private final RestClient restClient;

    public BrevoNotificadorEmail(EmailProperties.Brevo config, RestClient restClient) {
        this.config = config;
        this.restClient = restClient;
    }

    @Override
    public void enviar(String destino, String asunto, String contenidoHtml) {
        Map<String, Object> cuerpo = Map.of(
                "sender", Map.of("email", config.getRemitenteEmail(), "name", config.getRemitenteNombre()),
                "to", List.of(Map.of("email", destino)),
                "subject", asunto,
                "htmlContent", contenidoHtml);
        try {
            restClient.post()
                    .uri(config.getUrl())
                    .header("api-key", config.getApiKey())
                    .contentType(MediaType.APPLICATION_JSON)
                    .accept(MediaType.APPLICATION_JSON)
                    .body(cuerpo)
                    .retrieve()
                    .toBodilessEntity();
        } catch (RestClientResponseException e) {
            String respuesta = e.getResponseBodyAsString();
            if (respuesta.length() > MAX_CUERPO_ERROR) {
                respuesta = respuesta.substring(0, MAX_CUERPO_ERROR);
            }
            throw new EnvioEmailException(
                    "Brevo respondió %d: %s".formatted(e.getStatusCode().value(), respuesta), e);
        } catch (RestClientException e) {
            throw new EnvioEmailException("No se pudo contactar a Brevo: " + e.getMessage(), e);
        }
    }
}
