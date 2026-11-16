package com.planificacion.api.importer;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * Formato del respaldo JSON que exporta el frontend (versiones 1 a 3, cuando los datos vivían en el navegador).
 * Los valores de los enums vienen en español y en minúsculas (ej. "pendiente", "pagomovil").
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record LegacyBackup(
        String app,
        Integer version,
        @NotNull List<@Valid Activity> activities,
        @NotNull Map<String, List<String>> checks,
        @NotNull List<@Valid Task> tasks,
        @Valid Finance finance,
        @Valid Nutrition nutrition) {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Activity(@NotNull String id, @NotNull String name, @NotNull String icon, String description) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Task(@NotNull String name, String description, @NotNull String status, @NotNull String priority,
                       @NotNull LocalDate deadline) {
    }

    /** Las tasas actuales no se importan: cada movimiento ya trae la tasa de su día. */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Finance(@NotNull List<@Valid Movement> movements) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Movement(@NotNull String kind, @NotNull LocalDate date, @NotNull String account,
                           @NotNull BigDecimal amount, String description, String incomeType, String reason,
                           String expenseClass, String category, @NotNull BigDecimal rateUsd,
                           @NotNull BigDecimal rateEur, BigDecimal usdtRate, String linkId) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Nutrition(@NotNull List<@Valid Food> foods, @NotNull List<@Valid LogEntry> log,
                            @NotNull List<@Valid Body> body, Profile profile, Targets targets) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Food(@NotNull String id, @NotNull String name, @NotNull String unit, @NotNull BigDecimal per,
                       @NotNull BigDecimal kcal, BigDecimal protein, BigDecimal carbs, BigDecimal fat,
                       BigDecimal fiber) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record LogEntry(@NotNull LocalDate date, @NotNull String meal, @NotNull String name,
                           @NotNull BigDecimal amount, @NotNull String unit, String foodId, @NotNull BigDecimal kcal,
                           BigDecimal protein, BigDecimal carbs, BigDecimal fat, BigDecimal fiber) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Body(@NotNull LocalDate date, @NotNull BigDecimal weight, BigDecimal bodyFat, BigDecimal waist,
                       String note) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Profile(String sex, Integer age, BigDecimal height, String activity, String goal) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Targets(BigDecimal kcal, BigDecimal protein, BigDecimal carbs, BigDecimal fat, BigDecimal fiber) {
    }
}
