package com.planificacion.api.nutrition;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class NutritionCalculatorTest {

    @Test
    void conPorcentajeDeGrasaUsaKatchMcArdle() {
        // Hombre, 27 años, 176 cm, 78,4 kg, 18,6 % grasa, actividad moderada, recomposición
        NutritionCalculator.Plan plan = NutritionCalculator.plan(Sex.MALE, 27, 176, 78.4, 18.6,
                ActivityLevel.MODERATE, Goal.RECOMPOSITION);

        assertThat(plan.method()).isEqualTo(NutritionCalculator.Method.KATCH_MCARDLE);
        assertThat(plan.leanMassKg()).isEqualByComparingTo("63.8");
        assertThat(plan.bmr()).isEqualTo(1748);
        assertThat(plan.tdee()).isEqualTo(2710);
        assertThat(plan.kcal()).isEqualTo(2440);    // −10 % redondeado a decenas
        assertThat(plan.protein()).isEqualTo(172);  // 2,2 g/kg
        assertThat(plan.fat()).isEqualTo(68);       // 25 % de las kcal
        assertThat(plan.carbs()).isEqualTo(285);    // el resto
        assertThat(plan.fiber()).isEqualTo(34);
    }

    @Test
    void sinPorcentajeDeGrasaUsaMifflinStJeor() {
        // Mujer, 30 años, 165 cm, 60 kg: 10·60 + 6,25·165 − 5·30 − 161 = 1320,25
        NutritionCalculator.Plan plan = NutritionCalculator.plan(Sex.FEMALE, 30, 165, 60, null,
                ActivityLevel.SEDENTARY, Goal.MAINTAIN);

        assertThat(plan.method()).isEqualTo(NutritionCalculator.Method.MIFFLIN_ST_JEOR);
        assertThat(plan.bmr()).isEqualTo(1320);
        assertThat(plan.kcal()).isEqualTo(1580);    // 1320,25 × 1,2 = 1584 → 1580
        assertThat(plan.leanMassKg()).isNull();
    }

    @Test
    void imc() {
        assertThat(NutritionCalculator.bmi(new BigDecimal("78.4"), new BigDecimal("176")))
                .isEqualByComparingTo("25.3");
    }

    @Test
    void macrosDeUnaCantidadSonProporcionales() {
        Food arroz = new Food(null);
        arroz.setPortion(new BigDecimal("100"));
        arroz.setKcal(new BigDecimal("130"));
        arroz.setProtein(new BigDecimal("2.7"));
        arroz.setCarbs(new BigDecimal("28.2"));
        arroz.setFat(new BigDecimal("0.3"));
        arroz.setFiber(new BigDecimal("0.4"));

        Macros m = arroz.macrosFor(new BigDecimal("250"));

        assertThat(m.kcal()).isEqualByComparingTo("325.0");
        assertThat(m.carbs()).isEqualByComparingTo("70.5");
    }
}
