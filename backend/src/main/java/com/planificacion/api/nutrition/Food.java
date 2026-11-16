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
import java.math.RoundingMode;
import java.util.UUID;

/** Alimento con sus valores por {@code portion} unidades. Sin usuario = catálogo global. */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "foods")
public class Food extends BaseEntity {

    @Column(name = "user_id", updatable = false)
    private UUID userId;

    @Column(nullable = false, length = 120)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private FoodUnit unit;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal portion;

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

    public Food(UUID userId) {
        this.userId = userId;
    }

    public boolean isGlobal() {
        return userId == null;
    }

    public Macros macros() {
        return new Macros(kcal, protein, carbs, fat, fiber);
    }

    /** Macros de una cantidad concreta (en la misma unidad del alimento). */
    public Macros macrosFor(BigDecimal amount) {
        return macros().times(amount.divide(portion, 6, RoundingMode.HALF_UP));
    }
}
