package com.planificacion.api.nutrition;

import com.planificacion.api.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Alimento consumido. Copia nombre y macros (snapshot) para que editar o borrar
 * el alimento del catálogo no altere lo que ya comiste.
 */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "food_log_entries")
public class FoodLogEntry extends BaseEntity {

    @Column(name = "user_id", nullable = false, updatable = false)
    private UUID userId;

    @Column(name = "entry_date", nullable = false)
    private LocalDate date;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Meal meal;

    @Column(name = "food_id")
    private UUID foodId;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private FoodUnit unit;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal kcal;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal protein;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal carbs;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal fat;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal fiber;

    public FoodLogEntry(UUID userId) {
        this.userId = userId;
    }

    public Macros macros() {
        return new Macros(kcal, protein, carbs, fat, fiber);
    }

    public void setMacros(Macros m) {
        this.kcal = m.kcal();
        this.protein = m.protein();
        this.carbs = m.carbs();
        this.fat = m.fat();
        this.fiber = m.fiber();
    }

    /** Copia para duplicar un día completo. */
    public FoodLogEntry copyTo(LocalDate newDate) {
        FoodLogEntry c = new FoodLogEntry(userId);
        c.date = newDate;
        c.meal = meal;
        c.foodId = foodId;
        c.name = name;
        c.amount = amount;
        c.unit = unit;
        c.setMacros(macros());
        return c;
    }
}
