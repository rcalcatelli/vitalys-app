package com.vitalys.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Configuración del firmado JWT, poblada desde variables de entorno (`JWT_SECRET`,
 * `JWT_EXPIRATION_MS`) vía {@code application*.properties}. Nunca hardcodear un valor real acá.
 */
@ConfigurationProperties(prefix = "vitalys.jwt")
public class JwtProperties {

    /** Clave de firma HS256 (mínimo 256 bits), inyectada desde {@code JWT_SECRET}. */
    private String secret;

    /** TTL del token en milisegundos (24h = 86400000, Decisión 9/RNF-10). */
    private long expirationMs;

    public String getSecret() {
        return secret;
    }

    public void setSecret(String secret) {
        this.secret = secret;
    }

    public long getExpirationMs() {
        return expirationMs;
    }

    public void setExpirationMs(long expirationMs) {
        this.expirationMs = expirationMs;
    }
}
