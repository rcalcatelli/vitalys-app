package com.vitalys.service.notificaciones;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import com.vitalys.config.EmailProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

/** El adaptador contra un servidor simulado: ningún test sale a la red ni usa una API key real. */
class BrevoNotificadorEmailTest {

    private static final String URL = "https://api.brevo.com/v3/smtp/email";

    private MockRestServiceServer servidor;
    private BrevoNotificadorEmail notificador;

    @BeforeEach
    void setUp() {
        EmailProperties.Brevo config = new EmailProperties().getBrevo();
        config.setApiKey("clave-de-prueba");
        config.setRemitenteEmail("avisos@vitalys.test");
        config.setRemitenteNombre("Vitalys");

        RestClient.Builder builder = RestClient.builder();
        servidor = MockRestServiceServer.bindTo(builder).build();
        notificador = new BrevoNotificadorEmail(config, builder.build());
    }

    @Test
    void enviar_haceElPostConHeaderApiKeyYElCuerpoEsperado() {
        servidor.expect(requestTo(URL))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("api-key", "clave-de-prueba"))
                .andExpect(header("Content-Type", MediaType.APPLICATION_JSON_VALUE))
                .andExpect(jsonPath("$.sender.email").value("avisos@vitalys.test"))
                .andExpect(jsonPath("$.sender.name").value("Vitalys"))
                .andExpect(jsonPath("$.to[0].email").value("paciente@vitalys.test"))
                .andExpect(jsonPath("$.subject").value("Turno cancelado"))
                .andExpect(jsonPath("$.htmlContent").value("<p>Hola</p>"))
                .andRespond(withSuccess("{\"messageId\":\"<x@y>\"}", MediaType.APPLICATION_JSON));

        notificador.enviar("paciente@vitalys.test", "Turno cancelado", "<p>Hola</p>");

        servidor.verify();
    }

    @Test
    void enviar_conRespuesta4xx_lanzaEnvioEmailExceptionConElEstado() {
        servidor.expect(requestTo(URL))
                .andRespond(withStatus(HttpStatus.UNAUTHORIZED)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("{\"message\":\"Key not found\"}"));

        assertThatThrownBy(() -> notificador.enviar("a@b.test", "x", "y"))
                .isInstanceOf(EnvioEmailException.class)
                .hasMessageContaining("401")
                .hasMessageContaining("Key not found");
    }

    @Test
    void enviar_conRespuestaDeErrorLarga_laTrunca() {
        servidor.expect(requestTo(URL)).andRespond(withServerError().body("x".repeat(1000)));

        assertThatThrownBy(() -> notificador.enviar("a@b.test", "x", "y"))
                .isInstanceOf(EnvioEmailException.class)
                .satisfies(e -> assertThat(e.getMessage().length()).isLessThan(400));
    }

    @Test
    void enviar_conFalloDeRed_lanzaEnvioEmailException() {
        servidor.expect(requestTo(URL)).andRespond(request -> {
            throw new java.io.IOException("conexión rechazada");
        });

        assertThatThrownBy(() -> notificador.enviar("a@b.test", "x", "y"))
                .isInstanceOf(EnvioEmailException.class)
                .hasMessageContaining("No se pudo contactar a Brevo");
    }

    @Test
    void enviar_noPersisteNiExponeLaApiKeyEnElCuerpo() {
        servidor.expect(requestTo(URL))
                .andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("clave-de-prueba"))))
                .andRespond(withSuccess());

        notificador.enviar("a@b.test", "x", "y");

        servidor.verify();
    }
}
