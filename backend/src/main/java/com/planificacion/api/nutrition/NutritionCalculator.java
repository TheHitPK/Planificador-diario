package com.planificacion.api.nutrition;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Cálculo de objetivos (funciones puras):
 * <ul>
 *   <li>Metabolismo basal: Katch-McArdle si se conoce el % de grasa (usa masa magra, más preciso);
 *       si no, Mifflin-St Jeor.</li>
 *   <li>Gasto diario = basal × factor de actividad, ajustado según el objetivo.</li>
 *   <li>Proteína por kg de peso según objetivo; grasa 25 % de las calorías; carbohidratos el resto;
 *       fibra 14 g por cada 1000 kcal.</li>
 * </ul>
 * Son estimaciones estándar para empezar; se ajustan según la evolución real del peso.
 */
public final class NutritionCalculator {

    private static final double FAT_SHARE = 0.25;
    private static final double FIBER_PER_1000_KCAL = 14;

    private NutritionCalculator() {
    }

    public enum Method { KATCH_MCARDLE, MIFFLIN_ST_JEOR }

    public record Plan(int bmr, int tdee, Method method, BigDecimal leanMassKg,
                       int kcal, int protein, int carbs, int fat, int fiber) {
    }

    public static Plan plan(Sex sex, int age, double heightCm, double weightKg, Double bodyFatPct,
                            ActivityLevel activity, Goal goal) {
        Double leanMass = bodyFatPct != null && bodyFatPct > 0 && bodyFatPct < 70
                ? weightKg * (1 - bodyFatPct / 100)
                : null;
        double bmr = leanMass != null
                ? 370 + 21.6 * leanMass
                : 10 * weightKg + 6.25 * heightCm - 5 * age + (sex == Sex.MALE ? 5 : -161);
        double tdee = bmr * activity.factor();

        int kcal = (int) (Math.round(tdee * (1 + goal.calorieAdjustment()) / 10.0) * 10);
        int protein = (int) Math.round(weightKg * goal.proteinPerKg());
        int fat = (int) Math.round(kcal * FAT_SHARE / 9);
        int carbs = Math.max(0, (int) Math.round((kcal - protein * 4.0 - fat * 9.0) / 4));
        int fiber = (int) Math.round(kcal / 1000.0 * FIBER_PER_1000_KCAL);

        return new Plan((int) Math.round(bmr), (int) Math.round(tdee),
                leanMass != null ? Method.KATCH_MCARDLE : Method.MIFFLIN_ST_JEOR,
                leanMass != null ? BigDecimal.valueOf(leanMass).setScale(1, RoundingMode.HALF_UP) : null,
                kcal, protein, carbs, fat, fiber);
    }

    /** Índice de masa corporal. No distingue músculo de grasa. */
    public static BigDecimal bmi(BigDecimal weightKg, BigDecimal heightCm) {
        BigDecimal m = heightCm.movePointLeft(2);
        return weightKg.divide(m.multiply(m), 1, RoundingMode.HALF_UP);
    }
}
