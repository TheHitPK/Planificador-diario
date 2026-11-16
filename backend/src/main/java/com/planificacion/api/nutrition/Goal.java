package com.planificacion.api.nutrition;

/**
 * Objetivo físico: ajuste de calorías sobre el gasto diario y proteína por kg de peso.
 */
public enum Goal {
    LOSE_FAT(-0.20, 2.2),
    RECOMPOSITION(-0.10, 2.2),
    MAINTAIN(0.0, 1.8),
    GAIN_MUSCLE(0.10, 2.0);

    private final double calorieAdjustment;
    private final double proteinPerKg;

    Goal(double calorieAdjustment, double proteinPerKg) {
        this.calorieAdjustment = calorieAdjustment;
        this.proteinPerKg = proteinPerKg;
    }

    public double calorieAdjustment() {
        return calorieAdjustment;
    }

    public double proteinPerKg() {
        return proteinPerKg;
    }
}
