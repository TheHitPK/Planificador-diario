package com.planificacion.api.planning;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public final class PlanningDtos {

    private PlanningDtos() {
    }

    /** Un día del rango: qué disciplinas cumplió y su semáforo. */
    public record DayResponse(LocalDate date, List<UUID> completed, int done, int total, CompletionLevel level) {
    }

    /** Rango completo (semana, mes…) con el resumen acumulado. */
    public record RangeResponse(LocalDate from, LocalDate to, int disciplines, List<DayResponse> days,
                                Summary summary) {
    }

    /**
     * Solo cuentan los días ya vividos (≤ hoy) y desde el primer registro del usuario,
     * para que las semanas antes de empezar a usar la app no bajen el porcentaje.
     */
    public record Summary(int done, int total, Double ratio, CompletionLevel level) {
    }
}
