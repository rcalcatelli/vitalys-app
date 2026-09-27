package com.vitalys;

import com.vitalys.config.JwtProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties(JwtProperties.class)
public class VitalysApplication {

    public static void main(String[] args) {
        SpringApplication.run(VitalysApplication.class, args);
    }
}
