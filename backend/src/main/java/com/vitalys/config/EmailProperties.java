package com.vitalys.config;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Configuración del envío de emails (avisos de cancelación, etc.), poblada desde
 * {@code application*.properties}. Los secretos (API key, remitente) llegan por variables de
 * entorno; nada se versiona.
 */
@ConfigurationProperties(prefix = "vitalys.email")
public class EmailProperties {

    /**
     * Quién envía: {@code log} (por defecto: solo registra el email en el log, sin salir a la red)
     * o {@code brevo} (API HTTP de Brevo). Se usa HTTP y no SMTP porque Render free bloquea los
     * puertos SMTP salientes.
     */
    private String proveedor = "log";

    /** Espera antes del único reintento automático de un envío fallido. */
    private Duration reintentoDelay = Duration.ofSeconds(10);

    /**
     * Antigüedad a partir de la cual un envío "en curso" (no exitoso, con menos de 2 intentos) se
     * considera huérfano: el reintento en memoria se perdió, por ejemplo por un reinicio.
     */
    private Duration umbralHuerfanas = Duration.ofMinutes(5);

    private final Brevo brevo = new Brevo();

    public static class Brevo {

        private String url = "https://api.brevo.com/v3/smtp/email";
        private String apiKey;
        private String remitenteEmail;
        private String remitenteNombre = "Vitalys";
        private Duration timeout = Duration.ofSeconds(10);

        public String getUrl() {
            return url;
        }

        public void setUrl(String url) {
            this.url = url;
        }

        public String getApiKey() {
            return apiKey;
        }

        public void setApiKey(String apiKey) {
            this.apiKey = apiKey;
        }

        public String getRemitenteEmail() {
            return remitenteEmail;
        }

        public void setRemitenteEmail(String remitenteEmail) {
            this.remitenteEmail = remitenteEmail;
        }

        public String getRemitenteNombre() {
            return remitenteNombre;
        }

        public void setRemitenteNombre(String remitenteNombre) {
            this.remitenteNombre = remitenteNombre;
        }

        public Duration getTimeout() {
            return timeout;
        }

        public void setTimeout(Duration timeout) {
            this.timeout = timeout;
        }
    }

    public String getProveedor() {
        return proveedor;
    }

    public void setProveedor(String proveedor) {
        this.proveedor = proveedor;
    }

    public Duration getReintentoDelay() {
        return reintentoDelay;
    }

    public void setReintentoDelay(Duration reintentoDelay) {
        this.reintentoDelay = reintentoDelay;
    }

    public Duration getUmbralHuerfanas() {
        return umbralHuerfanas;
    }

    public void setUmbralHuerfanas(Duration umbralHuerfanas) {
        this.umbralHuerfanas = umbralHuerfanas;
    }

    public Brevo getBrevo() {
        return brevo;
    }
}
