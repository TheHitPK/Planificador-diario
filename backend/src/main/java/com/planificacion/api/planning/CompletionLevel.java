package com.planificacion.api.planning;

/** Semáforo del día: verde = todo, amarillo = 40 % o más, rojo = menos. */
public enum CompletionLevel {
    GREEN,
    YELLOW,
    RED,
    NONE;

    static final double YELLOW_FROM = 0.4;

    public static CompletionLevel of(int done, int total) {
        if (total <= 0) return NONE;
        double ratio = (double) done / total;
        if (ratio >= 1) return GREEN;
        if (ratio >= YELLOW_FROM) return YELLOW;
        return RED;
    }
}
