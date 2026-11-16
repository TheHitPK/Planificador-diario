package com.planificacion.api.nutrition;

import java.math.BigDecimal;
import java.math.RoundingMode;

/** Calorías y macronutrientes (g). */
public record Macros(BigDecimal kcal, BigDecimal protein, BigDecimal carbs, BigDecimal fat, BigDecimal fiber) {

    public static final Macros ZERO = new Macros(BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO,
            BigDecimal.ZERO);

    public Macros plus(Macros o) {
        return new Macros(kcal.add(o.kcal), protein.add(o.protein), carbs.add(o.carbs), fat.add(o.fat),
                fiber.add(o.fiber));
    }

    public Macros times(BigDecimal factor) {
        return new Macros(r(kcal.multiply(factor)), r(protein.multiply(factor)), r(carbs.multiply(factor)),
                r(fat.multiply(factor)), r(fiber.multiply(factor)));
    }

    public Macros rounded() {
        return new Macros(r(kcal), r(protein), r(carbs), r(fat), r(fiber));
    }

    private static BigDecimal r(BigDecimal v) {
        return v.setScale(1, RoundingMode.HALF_UP);
    }
}
