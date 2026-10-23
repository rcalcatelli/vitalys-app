package com.vitalys.config;

import com.vitalys.security.OperarComoInterceptor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/** Registra la lista blanca de escrituras de "Operar como" (design.md D7) para toda la API. */
@Configuration
public class OperarComoWebConfig implements WebMvcConfigurer {

    private final OperarComoInterceptor operarComoInterceptor;

    public OperarComoWebConfig(OperarComoInterceptor operarComoInterceptor) {
        this.operarComoInterceptor = operarComoInterceptor;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(operarComoInterceptor).addPathPatterns("/**");
    }
}
