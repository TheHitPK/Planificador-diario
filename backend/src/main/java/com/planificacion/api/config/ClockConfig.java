package com.planificacion.api.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

import java.time.Clock;
import java.time.ZoneId;

/**
 * Reloj inyectable (los tests pueden fijar la hora). La zona es la de Venezuela porque
 * "hoy" para la planificación y la tasa BCV depende de la fecha local, no de UTC.
 */
@Configuration
@EnableScheduling
public class ClockConfig {

    public static final ZoneId ZONE = ZoneId.of("America/Caracas");

    @Bean
    Clock clock() {
        return Clock.system(ZONE);
    }
}
