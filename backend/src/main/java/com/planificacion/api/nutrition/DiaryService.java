package com.planificacion.api.nutrition;

import com.planificacion.api.common.error.BusinessRuleException;
import com.planificacion.api.common.error.NotFoundException;
import com.planificacion.api.nutrition.NutritionDtos.DayTotal;
import com.planificacion.api.nutrition.NutritionDtos.DiaryResponse;
import com.planificacion.api.nutrition.NutritionDtos.LogEntryRequest;
import com.planificacion.api.nutrition.NutritionDtos.LogEntryResponse;
import com.planificacion.api.nutrition.NutritionDtos.LogEntryUpdateRequest;
import com.planificacion.api.nutrition.NutritionDtos.MealGroup;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.UUID;
import java.util.function.Function;

@Service
@Transactional
public class DiaryService {

    private final FoodLogEntryRepository repo;
    private final FoodService foods;
    private final ProfileService profiles;

    public DiaryService(FoodLogEntryRepository repo, FoodService foods, ProfileService profiles) {
        this.repo = repo;
        this.foods = foods;
        this.profiles = profiles;
    }

    @Transactional(readOnly = true)
    public DiaryResponse day(UUID userId, LocalDate date) {
        List<FoodLogEntry> entries = repo.findByUserIdAndDateOrderByCreatedAtAsc(userId, date);
        Macros consumed = entries.stream().map(FoodLogEntry::macros).reduce(Macros.ZERO, Macros::plus).rounded();
        Macros targets = profiles.targets(userId);

        List<MealGroup> meals = new ArrayList<>();
        for (Meal meal : Meal.values()) {
            List<FoodLogEntry> items = entries.stream().filter(e -> e.getMeal() == meal).toList();
            meals.add(new MealGroup(meal,
                    items.stream().map(FoodLogEntry::macros).reduce(Macros.ZERO, Macros::plus).rounded(),
                    items.stream().map(LogEntryResponse::from).toList()));
        }

        Macros remaining = new Macros(
                targets.kcal().subtract(consumed.kcal()), targets.protein().subtract(consumed.protein()),
                targets.carbs().subtract(consumed.carbs()), targets.fat().subtract(consumed.fat()),
                targets.fiber().subtract(consumed.fiber()));

        Map<String, Integer> percent = new LinkedHashMap<>();
        percent.put("kcal", pct(consumed, targets, Macros::kcal));
        percent.put("protein", pct(consumed, targets, Macros::protein));
        percent.put("carbs", pct(consumed, targets, Macros::carbs));
        percent.put("fat", pct(consumed, targets, Macros::fat));
        percent.put("fiber", pct(consumed, targets, Macros::fiber));

        return new DiaryResponse(date, consumed, targets, remaining, percent, meals);
    }

    /** Registros individuales de un rango (el frontend los agrupa por día). */
    @Transactional(readOnly = true)
    public List<LogEntryResponse> entries(UUID userId, LocalDate from, LocalDate to) {
        if (to.isBefore(from) || ChronoUnit.DAYS.between(from, to) > 800) {
            throw new BusinessRuleException("Rango inválido (máximo 800 días)");
        }
        return repo.findByUserIdAndDateBetween(userId, from, to).stream()
                .sorted(Comparator.comparing(FoodLogEntry::getDate).thenComparing(FoodLogEntry::getCreatedAt))
                .map(LogEntryResponse::from)
                .toList();
    }

    /** Totales por día en un rango (para el gráfico de 7 días, promedios, etc.). */
    @Transactional(readOnly = true)
    public List<DayTotal> totals(UUID userId, LocalDate from, LocalDate to) {
        if (to.isBefore(from) || ChronoUnit.DAYS.between(from, to) > 400) {
            throw new BusinessRuleException("Rango inválido (máximo 400 días)");
        }
        Map<LocalDate, Macros> byDay = new TreeMap<>();
        for (LocalDate d = from; !d.isAfter(to); d = d.plusDays(1)) byDay.put(d, Macros.ZERO);
        for (FoodLogEntry e : repo.findByUserIdAndDateBetween(userId, from, to)) {
            byDay.merge(e.getDate(), e.macros(), Macros::plus);
        }
        return byDay.entrySet().stream().map(en -> new DayTotal(en.getKey(), en.getValue().rounded())).toList();
    }

    public LogEntryResponse add(UUID userId, LogEntryRequest req) {
        FoodLogEntry e = new FoodLogEntry(userId);
        e.setDate(req.date());
        e.setMeal(req.meal());

        if (req.foodId() != null) {
            if (req.amount() == null) throw new BusinessRuleException("amount es obligatorio al usar foodId");
            Food food = foods.loadVisible(userId, req.foodId());
            e.setFoodId(food.getId());
            e.setName(food.getName());
            e.setUnit(food.getUnit());
            e.setAmount(req.amount());
            e.setMacros(food.macrosFor(req.amount()));
        } else {
            // Registro rápido: 1 unidad con los macros indicados.
            if (req.name() == null || req.name().isBlank()) {
                throw new BusinessRuleException("Indica foodId o un nombre para el registro rápido");
            }
            BigDecimal p = orZero(req.protein());
            BigDecimal c = orZero(req.carbs());
            BigDecimal f = orZero(req.fat());
            BigDecimal kcal = req.kcal() != null ? req.kcal() : FoodService.kcalFromMacros(p, c, f);
            if (kcal.signum() <= 0) throw new BusinessRuleException("Indica las calorías o los macros");
            e.setName(req.name().trim());
            e.setUnit(FoodUnit.UNIT);
            e.setAmount(BigDecimal.ONE);
            e.setMacros(new Macros(kcal, p, c, f, orZero(req.fiber())).rounded());
        }
        return LogEntryResponse.from(repo.save(e));
    }

    /** Cambia cantidad o comida. Si viene de un alimento, recalcula los macros de forma proporcional. */
    public LogEntryResponse update(UUID userId, UUID id, LogEntryUpdateRequest req) {
        FoodLogEntry e = load(userId, id);
        BigDecimal factor = req.amount().divide(e.getAmount(), 6, RoundingMode.HALF_UP);
        e.setMacros(e.macros().times(factor));
        e.setAmount(req.amount());
        e.setMeal(req.meal());
        return LogEntryResponse.from(e);
    }

    public void delete(UUID userId, UUID id) {
        repo.delete(load(userId, id));
    }

    /** Copia todas las comidas de un día a otro (útil si comes parecido a diario). */
    public List<LogEntryResponse> copyDay(UUID userId, LocalDate from, LocalDate to) {
        if (from.equals(to)) throw new BusinessRuleException("Los días deben ser distintos");
        List<FoodLogEntry> source = repo.findByUserIdAndDateOrderByCreatedAtAsc(userId, from);
        if (source.isEmpty()) throw new BusinessRuleException("El día " + from + " no tiene comidas registradas");
        return repo.saveAll(source.stream().map(e -> e.copyTo(to)).toList()).stream()
                .map(LogEntryResponse::from).toList();
    }

    private FoodLogEntry load(UUID userId, UUID id) {
        return repo.findByIdAndUserId(id, userId).orElseThrow(() -> new NotFoundException("Registro de comida"));
    }

    private static int pct(Macros consumed, Macros targets, Function<Macros, BigDecimal> field) {
        BigDecimal target = field.apply(targets);
        if (target.signum() <= 0) return 0;
        return field.apply(consumed).multiply(BigDecimal.valueOf(100)).divide(target, 0, RoundingMode.HALF_UP).intValue();
    }

    private static BigDecimal orZero(BigDecimal v) {
        return v != null ? v : BigDecimal.ZERO;
    }
}
