package com.planificacion.api.planning;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import static org.assertj.core.api.Assertions.assertThat;

class CompletionLevelTest {

    @ParameterizedTest(name = "{0}/{1} → {2}")
    @CsvSource({
            "5, 5, GREEN",
            "4, 5, YELLOW",
            "2, 5, YELLOW",   // 40 % exacto ya es amarillo
            "1, 5, RED",
            "0, 5, RED",
            "0, 0, NONE",
    })
    void semaforoDelDia(int done, int total, CompletionLevel expected) {
        assertThat(CompletionLevel.of(done, total)).isEqualTo(expected);
    }
}
