package com.vitalys.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * CORS sobre {@code /api/**} restringido a los orígenes del frontend, declarados en
 * {@code vitalys.cors.allowed-origins} (variable de entorno {@code CORS_ALLOWED_ORIGINS}, lista
 * separada por comas). En producción es el dominio de Vercel; en local, el dev server de Vite.
 * Un origen que no está en la lista recibe 403 en el preflight y el navegador bloquea la llamada.
 *
 * <p>Sin credenciales de cookies involucradas (auth es por header Bearer), así que no se habilita
 * {@code allowCredentials}.
 */
@Configuration
public class CorsConfig {

    private final String[] origenesPermitidos;

    public CorsConfig(@Value("${vitalys.cors.allowed-origins}") String[] origenesPermitidos) {
        this.origenesPermitidos = origenesPermitidos;
    }

    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                registry.addMapping("/api/**")
                        .allowedOrigins(origenesPermitidos)
                        .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                        .allowedHeaders("*");
            }
        };
    }
}
