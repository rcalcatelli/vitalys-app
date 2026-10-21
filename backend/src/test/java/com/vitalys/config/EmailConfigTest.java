package com.vitalys.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.vitalys.service.notificaciones.BrevoNotificadorEmail;
import com.vitalys.service.notificaciones.LogNotificadorEmail;
import org.junit.jupiter.api.Test;

class EmailConfigTest {

    private final EmailConfig config = new EmailConfig();

    @Test
    void porDefecto_elProveedorEsElLog() {
        assertThat(new EmailProperties().getProveedor()).isEqualTo("log");
        assertThat(config.logNotificadorEmail()).isInstanceOf(LogNotificadorEmail.class);
        // El log no debe fallar nunca
        config.logNotificadorEmail().enviar("a@b.test", "asunto", "<p>x</p>");
    }

    @Test
    void brevo_sinApiKeyORemitente_noArranca() {
        EmailProperties sinClave = new EmailProperties();
        sinClave.getBrevo().setRemitenteEmail("avisos@vitalys.test");
        EmailProperties sinRemitente = new EmailProperties();
        sinRemitente.getBrevo().setApiKey("k");
        EmailProperties vacia = new EmailProperties();
        vacia.getBrevo().setApiKey(" ");
        vacia.getBrevo().setRemitenteEmail("avisos@vitalys.test");

        assertThatThrownBy(() -> config.brevoNotificadorEmail(sinClave)).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> config.brevoNotificadorEmail(sinRemitente)).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> config.brevoNotificadorEmail(vacia)).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void brevo_conCredenciales_creaElAdaptador() {
        EmailProperties propiedades = new EmailProperties();
        propiedades.getBrevo().setApiKey("k");
        propiedades.getBrevo().setRemitenteEmail("avisos@vitalys.test");

        assertThat(config.brevoNotificadorEmail(propiedades)).isInstanceOf(BrevoNotificadorEmail.class);
    }
}
