package com.planificacion.api.nutrition;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public final class NutritionDtos {

    private NutritionDtos() {
    }

    // ---- Alimentos ----

    public record FoodRequest(
            @NotBlank @Size(max = 120) String name,
            @NotNull FoodUnit unit,
            @NotNull @Positive BigDecimal portion,
            /* Si falta, se calcula de los macros (4·4·9). */
            @PositiveOrZero BigDecimal kcal,
            @NotNull @PositiveOrZero BigDecimal protein,
            @NotNull @PositiveOrZero BigDecimal carbs,
            @NotNull @PositiveOrZero BigDecimal fat,
            @PositiveOrZero BigDecimal fiber) {
    }

    public record FoodResponse(UUID id, String name, FoodUnit unit, BigDecimal portion, BigDecimal kcal,
                               BigDecimal protein, BigDecimal carbs, BigDecimal fat, BigDecimal fiber,
                               boolean global) {
        public static FoodResponse from(Food f) {
            return new FoodResponse(f.getId(), f.getName(), f.getUnit(), f.getPortion(), f.getKcal(), f.getProtein(),
                    f.getCarbs(), f.getFat(), f.getFiber(), f.isGlobal());
        }
    }

    // ---- Diario ----

    /**
     * Dos formas: con {@code foodId} + {@code amount} (se calculan los macros) o
     * registro rápido con {@code name} + macros.
     */
    public record LogEntryRequest(
            @NotNull LocalDate date,
            @NotNull Meal meal,
            UUID foodId,
            @Positive BigDecimal amount,
            @Size(max = 120) String name,
            @PositiveOrZero BigDecimal kcal,
            @PositiveOrZero BigDecimal protein,
            @PositiveOrZero BigDecimal carbs,
            @PositiveOrZero BigDecimal fat,
            @PositiveOrZero BigDecimal fiber) {
    }

    /** Cambiar cantidad o comida de un registro existente. */
    public record LogEntryUpdateRequest(@NotNull Meal meal, @NotNull @Positive BigDecimal amount) {
    }

    public record CopyDayRequest(@NotNull LocalDate from, @NotNull LocalDate to) {
    }

    public record LogEntryResponse(UUID id, LocalDate date, Meal meal, UUID foodId, String name, BigDecimal amount,
                                   FoodUnit unit, Macros macros) {
        public static LogEntryResponse from(FoodLogEntry e) {
            return new LogEntryResponse(e.getId(), e.getDate(), e.getMeal(), e.getFoodId(), e.getName(),
                    e.getAmount(), e.getUnit(), e.macros());
        }
    }

    public record MealGroup(Meal meal, Macros totals, List<LogEntryResponse> entries) {
    }

    /** {@code percent}: consumido / objetivo × 100 por macro. */
    public record DiaryResponse(LocalDate date, Macros consumed, Macros targets, Macros remaining,
                                Map<String, Integer> percent, List<MealGroup> meals) {
    }

    public record DayTotal(LocalDate date, Macros consumed) {
    }

    // ---- Cuerpo ----

    public record BodyRequest(
            @NotNull LocalDate date,
            @NotNull @DecimalMin("20") @DecimalMax("400") BigDecimal weightKg,
            @DecimalMin("2") @DecimalMax("70") BigDecimal bodyFatPct,
            @DecimalMin("30") @DecimalMax("250") BigDecimal waistCm,
            @Size(max = 255) String note) {
    }

    public record BodyResponse(UUID id, LocalDate date, BigDecimal weightKg, BigDecimal bodyFatPct,
                               BigDecimal waistCm, BigDecimal leanMassKg, BigDecimal fatMassKg, String note) {
        public static BodyResponse from(BodyMeasurement b) {
            return new BodyResponse(b.getId(), b.getDate(), b.getWeightKg(), b.getBodyFatPct(), b.getWaistCm(),
                    b.leanMassKg(), b.fatMassKg(), b.getNote());
        }
    }

    /** Estado actual y cambio desde el primer registro. */
    public record BodySummary(BodyResponse latest, BigDecimal weightChangeKg, BigDecimal bodyFatChangePct,
                              BigDecimal bmi, List<BodyResponse> history) {
    }

    // ---- Perfil y objetivos ----

    public record ProfileRequest(
            Sex sex,
            @Past LocalDate birthDate,
            @DecimalMin("100") @DecimalMax("250") BigDecimal heightCm,
            ActivityLevel activityLevel,
            Goal goal) {
    }

    public record TargetsRequest(
            @NotNull @Min(0) @Max(10000) Integer kcal,
            @NotNull @Min(0) @Max(1000) Integer protein,
            @NotNull @Min(0) @Max(2000) Integer carbs,
            @NotNull @Min(0) @Max(1000) Integer fat,
            @NotNull @Min(0) @Max(200) Integer fiber) {
    }

    public record ProfileResponse(Sex sex, LocalDate birthDate, Integer age, BigDecimal heightCm,
                                  ActivityLevel activityLevel, Goal goal, Macros targets, boolean complete) {
    }

    public record PlanResponse(BigDecimal weightKg, BigDecimal bodyFatPct, NutritionCalculator.Plan plan) {
    }
}
