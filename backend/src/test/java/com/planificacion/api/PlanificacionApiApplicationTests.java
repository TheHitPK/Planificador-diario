package com.planificacion.api;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.testcontainers.junit.jupiter.Testcontainers;

/** Arranca la app completa: valida las migraciones de Flyway y el mapeo JPA contra Postgres. */
@SpringBootTest
@Import(TestcontainersConfiguration.class)
@Testcontainers(disabledWithoutDocker = true)
class PlanificacionApiApplicationTests {

    @Test
    void contextLoads() {
    }
}
