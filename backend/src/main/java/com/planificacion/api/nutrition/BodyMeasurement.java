package com.planificacion.api.nutrition;

import com.planificacion.api.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.UUID;

/** Peso y composición corporal de un día (máximo uno por día). */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "body_measurements")
public class BodyMeasurement extends BaseEntity {

    @Column(name = "user_id", nullable = false, updatable = false)
    private UUID userId;

    @Column(name = "measured_on", nullable = false)
    private LocalDate date;

    @Column(name = "weight_kg", nullable = false, precision = 5, scale = 2)
    private BigDecimal weightKg;

    @Column(name = "body_fat_pct", precision = 4, scale = 1)
    private BigDecimal bodyFatPct;

    @Column(name = "waist_cm", precision = 5, scale = 1)
    private BigDecimal waistCm;

    private String note;

    public BodyMeasurement(UUID userId, LocalDate date) {
        this.userId = userId;
        this.date = date;
    }

    /** Masa magra = peso × (1 − %grasa). Null si no hay % de grasa. */
    public BigDecimal leanMassKg() {
        if (bodyFatPct == null) return null;
        return weightKg.multiply(BigDecimal.ONE.subtract(bodyFatPct.movePointLeft(2))).setScale(1, RoundingMode.HALF_UP);
    }

    public BigDecimal fatMassKg() {
        if (bodyFatPct == null) return null;
        return weightKg.multiply(bodyFatPct.movePointLeft(2)).setScale(1, RoundingMode.HALF_UP);
    }
}
