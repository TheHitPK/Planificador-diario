package com.planificacion.api.nutrition;

/** Factor que multiplica el metabolismo basal para obtener el gasto diario. */
public enum ActivityLevel {
    SEDENTARY(1.2),
    LIGHT(1.375),
    MODERATE(1.55),
    HIGH(1.725),
    VERY_HIGH(1.9);

    private final double factor;

    ActivityLevel(double factor) {
        this.factor = factor;
    }

    public double factor() {
        return factor;
    }
}
