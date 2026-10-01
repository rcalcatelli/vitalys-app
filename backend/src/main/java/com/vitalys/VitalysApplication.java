package com.vitalys;

import com.vitalys.config.FeriadosProperties;
import com.vitalys.config.JwtProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * {@code @EnableScheduling} habilita el cron de sincronización del calendario de feriados
 * (RF-38, {@code JobSincronizacionFeriados}). El job en sí se puede apagar con
 * {@code vitalys.feriados.habilitado=false} sin tocar esta anotación.
 */
@SpringBootApplication
@EnableScheduling
@EnableConfigurationProperties({JwtProperties.class, FeriadosProperties.class})
public class VitalysApplication {

    public static void main(String[] args) {
        SpringApplication.run(VitalysApplication.class, args);
    }
}
