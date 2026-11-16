package com.planificacion.api.nutrition;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/** Datos personales para calcular objetivos + objetivos diarios. 1:1 con el usuario (PK = user_id). */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "nutrition_profiles")
public class NutritionProfile {

    public static final int DEFAULT_KCAL = 2000;
    public static final int DEFAULT_PROTEIN = 140;
    public static final int DEFAULT_CARBS = 200;
    public static final int DEFAULT_FAT = 60;
    public static final int DEFAULT_FIBER = 28;

    @Id
    @Column(name = "user_id")
    private UUID userId;

    @Enumerated(EnumType.STRING)
    private Sex sex;

    @Column(name = "birth_date")
    private LocalDate birthDate;

    @Column(name = "height_cm", precision = 5, scale = 1)
    private BigDecimal heightCm;

    @Enumerated(EnumType.STRING)
    @Column(name = "activity_level")
    private ActivityLevel activityLevel;

    @Enumerated(EnumType.STRING)
    private Goal goal;

    @Column(name = "target_kcal", nullable = false)
    private int targetKcal = DEFAULT_KCAL;

    @Column(name = "target_protein", nullable = false)
    private int targetProtein = DEFAULT_PROTEIN;

    @Column(name = "target_carbs", nullable = false)
    private int targetCarbs = DEFAULT_CARBS;

    @Column(name = "target_fat", nullable = false)
    private int targetFat = DEFAULT_FAT;

    @Column(name = "target_fiber", nullable = false)
    private int targetFiber = DEFAULT_FIBER;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public NutritionProfile(UUID userId) {
        this.userId = userId;
    }

    /** ¿Tiene los datos mínimos para calcular un plan? */
    public boolean isComplete() {
        return sex != null && birthDate != null && heightCm != null && activityLevel != null && goal != null;
    }

    public Macros targets() {
        return new Macros(BigDecimal.valueOf(targetKcal), BigDecimal.valueOf(targetProtein),
                BigDecimal.valueOf(targetCarbs), BigDecimal.valueOf(targetFat), BigDecimal.valueOf(targetFiber));
    }
}
