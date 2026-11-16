package com.planificacion.api.importer;

import com.planificacion.api.common.error.BusinessRuleException;
import com.planificacion.api.common.error.ConflictException;
import com.planificacion.api.discipline.Discipline;
import com.planificacion.api.discipline.DisciplineRepository;
import com.planificacion.api.finance.Account;
import com.planificacion.api.finance.ExpenseClass;
import com.planificacion.api.finance.ExpenseReason;
import com.planificacion.api.finance.IncomeType;
import com.planificacion.api.finance.Movement;
import com.planificacion.api.finance.MovementKind;
import com.planificacion.api.finance.MovementRepository;
import com.planificacion.api.nutrition.ActivityLevel;
import com.planificacion.api.nutrition.BodyMeasurement;
import com.planificacion.api.nutrition.BodyMeasurementRepository;
import com.planificacion.api.nutrition.Food;
import com.planificacion.api.nutrition.FoodLogEntry;
import com.planificacion.api.nutrition.FoodLogEntryRepository;
import com.planificacion.api.nutrition.FoodRepository;
import com.planificacion.api.nutrition.FoodUnit;
import com.planificacion.api.nutrition.Goal;
import com.planificacion.api.nutrition.Macros;
import com.planificacion.api.nutrition.Meal;
import com.planificacion.api.nutrition.NutritionProfile;
import com.planificacion.api.nutrition.NutritionProfileRepository;
import com.planificacion.api.nutrition.Sex;
import com.planificacion.api.planning.DisciplineCheck;
import com.planificacion.api.planning.DisciplineCheckRepository;
import com.planificacion.api.task.Task;
import com.planificacion.api.task.TaskPriority;
import com.planificacion.api.task.TaskRepository;
import com.planificacion.api.task.TaskStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Migra el respaldo del frontend (datos que vivían en localStorage) a la cuenta del usuario.
 * Todo o nada: corre en una sola transacción. Solo se permite en cuentas vacías para no duplicar datos.
 */
@Service
public class LegacyImportService {

    private static final Logger log = LoggerFactory.getLogger(LegacyImportService.class);

    private static final Map<String, TaskStatus> TASK_STATUS = Map.of(
            "pendiente", TaskStatus.PENDING, "en_progreso", TaskStatus.IN_PROGRESS, "completada", TaskStatus.COMPLETED);
    private static final Map<String, TaskPriority> TASK_PRIORITY = Map.of(
            "alta", TaskPriority.HIGH, "media", TaskPriority.MEDIUM, "baja", TaskPriority.LOW);
    private static final Map<String, Account> ACCOUNT = Map.of(
            "zelle", Account.ZELLE, "efectivo_usd", Account.CASH_USD, "usdt", Account.USDT,
            "efectivo_bs", Account.CASH_VES, "transferencia", Account.BANK_TRANSFER, "pagomovil", Account.PAGO_MOVIL);
    private static final Map<String, IncomeType> INCOME = Map.of(
            "sueldo", IncomeType.SALARY, "venta", IncomeType.SALE, "servicio", IncomeType.SERVICE,
            "cambio", IncomeType.EXCHANGE, "regalo", IncomeType.GIFT, "prestamo", IncomeType.LOAN,
            "reembolso", IncomeType.REFUND, "otro", IncomeType.OTHER);
    private static final Map<String, ExpenseReason> REASON = Map.of(
            "compra", ExpenseReason.PURCHASE, "pago", ExpenseReason.PAYMENT, "venta_divisas", ExpenseReason.CURRENCY_SALE,
            "cambio", ExpenseReason.EXCHANGE, "otro", ExpenseReason.OTHER);
    private static final Map<String, ExpenseClass> CLASS = Map.of(
            "gasto", ExpenseClass.EXPENSE, "costo", ExpenseClass.COST);
    private static final Map<String, FoodUnit> UNIT = Map.of(
            "g", FoodUnit.G, "ml", FoodUnit.ML, "unidad", FoodUnit.UNIT);
    private static final Map<String, Meal> MEAL = Map.of(
            "desayuno", Meal.BREAKFAST, "almuerzo", Meal.LUNCH, "cena", Meal.DINNER, "merienda", Meal.SNACK);
    private static final Map<String, Sex> SEX = Map.of("hombre", Sex.MALE, "mujer", Sex.FEMALE);
    private static final Map<String, ActivityLevel> ACTIVITY = Map.of(
            "sedentario", ActivityLevel.SEDENTARY, "ligero", ActivityLevel.LIGHT, "moderado", ActivityLevel.MODERATE,
            "alto", ActivityLevel.HIGH, "muy_alto", ActivityLevel.VERY_HIGH);
    private static final Map<String, Goal> GOAL = Map.of(
            "perder", Goal.LOSE_FAT, "recomposicion", Goal.RECOMPOSITION, "mantener", Goal.MAINTAIN,
            "ganar", Goal.GAIN_MUSCLE);

    private final DisciplineRepository disciplines;
    private final DisciplineCheckRepository checks;
    private final TaskRepository tasks;
    private final MovementRepository movements;
    private final FoodRepository foods;
    private final FoodLogEntryRepository foodLog;
    private final BodyMeasurementRepository body;
    private final NutritionProfileRepository profiles;
    private final Clock clock;

    public LegacyImportService(DisciplineRepository disciplines, DisciplineCheckRepository checks, TaskRepository tasks,
                               MovementRepository movements, FoodRepository foods, FoodLogEntryRepository foodLog,
                               BodyMeasurementRepository body, NutritionProfileRepository profiles, Clock clock) {
        this.disciplines = disciplines;
        this.checks = checks;
        this.tasks = tasks;
        this.movements = movements;
        this.foods = foods;
        this.foodLog = foodLog;
        this.body = body;
        this.profiles = profiles;
        this.clock = clock;
    }

    public record ImportResult(int disciplines, int checks, int tasks, int movements, int foods, int foodLogEntries,
                               int bodyMeasurements, boolean profile) {
    }

    @Transactional
    public ImportResult importBackup(UUID userId, LegacyBackup backup) {
        if (disciplines.existsByUserId(userId) || tasks.existsByUserId(userId) || movements.existsByUserId(userId)
                || foodLog.existsByUserId(userId) || body.existsByUserId(userId)) {
            throw new ConflictException("Tu cuenta ya tiene datos: la importación solo se permite en una cuenta vacía");
        }
        LocalDate today = LocalDate.now(clock);

        // ---- Disciplinas y días cumplidos ----
        Map<String, Discipline> disciplineByOldId = new HashMap<>();
        int position = 0;
        for (LegacyBackup.Activity a : backup.activities()) {
            Discipline d = new Discipline(userId);
            d.setName(truncate(a.name().trim(), 80));
            d.setIcon(truncate(a.icon().trim(), 16));
            d.setDescription(blankToNull(truncate(a.description(), 500)));
            d.setPosition(position++);
            disciplineByOldId.put(a.id(), disciplines.save(d));
        }
        List<DisciplineCheck> newChecks = new ArrayList<>();
        backup.checks().forEach((day, ids) -> {
            LocalDate date = parseDate(day);
            if (date.isAfter(today)) return;
            ids.stream().distinct().map(disciplineByOldId::get).filter(d -> d != null)
                    .forEach(d -> newChecks.add(new DisciplineCheck(d, date)));
        });
        checks.saveAll(newChecks);

        // ---- Pendientes ----
        for (LegacyBackup.Task t : backup.tasks()) {
            Task task = new Task(userId);
            task.setName(truncate(t.name().trim(), 150));
            task.setDescription(blankToNull(t.description()));
            task.setPriority(map(TASK_PRIORITY, t.priority(), "prioridad"));
            task.setDeadline(t.deadline());
            task.changeStatus(map(TASK_STATUS, t.status(), "estado"), clock.instant());
            tasks.save(task);
        }

        // ---- Finanzas ----
        int movementCount = 0;
        if (backup.finance() != null) {
            Map<String, UUID> groups = new HashMap<>();
            for (LegacyBackup.Movement m : backup.finance().movements()) {
                MovementKind kind = switch (m.kind()) {
                    case "entrada" -> MovementKind.INCOME;
                    case "salida" -> MovementKind.EXPENSE;
                    default -> throw new BusinessRuleException("Tipo de movimiento desconocido: " + m.kind());
                };
                Movement mv = new Movement(userId, kind);
                mv.setDate(m.date());
                mv.setAccount(map(ACCOUNT, m.account(), "cuenta"));
                mv.setAmount(m.amount());
                mv.setDescription(blankToNull(truncate(m.description(), 255)));
                mv.setRateUsd(m.rateUsd());
                mv.setRateEur(m.rateEur());
                mv.setUsdtRate(mv.getAccount() == Account.USDT ? m.usdtRate() : null);
                if (m.linkId() != null) {
                    mv.setTransferGroupId(groups.computeIfAbsent(m.linkId(), k -> UUID.randomUUID()));
                }
                if (kind == MovementKind.INCOME) {
                    mv.setIncomeType(map(INCOME, m.incomeType(), "tipo de entrada"));
                } else {
                    ExpenseReason reason = map(REASON, m.reason(), "motivo");
                    mv.setExpenseReason(reason);
                    if (!reason.isTransfer()) {
                        mv.setExpenseClass(m.expenseClass() != null ? map(CLASS, m.expenseClass(), "clasificación")
                                : ExpenseClass.EXPENSE);
                        mv.setCategory(blankToNull(truncate(m.category(), 50)));
                    }
                }
                movements.save(mv);
                movementCount++;
            }
        }

        // ---- Nutrición ----
        int foodCount = 0;
        int logCount = 0;
        int bodyCount = 0;
        boolean profileImported = false;
        LegacyBackup.Nutrition n = backup.nutrition();
        if (n != null) {
            // Los alimentos iguales a los del catálogo global se enlazan a él en vez de duplicarse.
            Map<String, Food> catalog = foods.findByUserIdIsNull().stream()
                    .collect(Collectors.toMap(f -> key(f.getName()), Function.identity(), (a, b) -> a));
            Map<String, UUID> foodIdByOldId = new HashMap<>();
            for (LegacyBackup.Food f : n.foods()) {
                Food global = catalog.get(key(f.name()));
                if (global != null && sameValues(global, f)) {
                    foodIdByOldId.put(f.id(), global.getId());
                    continue;
                }
                Food food = new Food(userId);
                food.setName(truncate(f.name().trim(), 120));
                food.setUnit(map(UNIT, f.unit(), "unidad"));
                food.setPortion(f.per());
                food.setKcal(f.kcal());
                food.setProtein(orZero(f.protein()));
                food.setCarbs(orZero(f.carbs()));
                food.setFat(orZero(f.fat()));
                food.setFiber(orZero(f.fiber()));
                foodIdByOldId.put(f.id(), foods.save(food).getId());
                foodCount++;
            }

            for (LegacyBackup.LogEntry e : n.log()) {
                FoodLogEntry entry = new FoodLogEntry(userId);
                entry.setDate(e.date());
                entry.setMeal(map(MEAL, e.meal(), "comida"));
                entry.setFoodId(e.foodId() != null ? foodIdByOldId.get(e.foodId()) : null);
                entry.setName(truncate(e.name().trim(), 120));
                entry.setAmount(e.amount());
                entry.setUnit(map(UNIT, e.unit(), "unidad"));
                entry.setMacros(new Macros(e.kcal(), orZero(e.protein()), orZero(e.carbs()), orZero(e.fat()),
                        orZero(e.fiber())));
                foodLog.save(entry);
                logCount++;
            }

            for (LegacyBackup.Body b : n.body()) {
                BodyMeasurement m = body.findByUserIdAndDate(userId, b.date())
                        .orElseGet(() -> new BodyMeasurement(userId, b.date()));
                m.setWeightKg(b.weight());
                m.setBodyFatPct(b.bodyFat());
                m.setWaistCm(b.waist());
                m.setNote(blankToNull(truncate(b.note(), 255)));
                body.save(m);
                bodyCount++;
            }

            if (n.profile() != null || n.targets() != null) {
                NutritionProfile p = profiles.findById(userId).orElseGet(() -> new NutritionProfile(userId));
                if (n.profile() != null) {
                    LegacyBackup.Profile lp = n.profile();
                    p.setSex(lp.sex() != null ? map(SEX, lp.sex(), "sexo") : null);
                    // El frontend guardaba la edad; aproximamos la fecha de nacimiento.
                    p.setBirthDate(lp.age() != null ? today.minusYears(lp.age()) : null);
                    p.setHeightCm(lp.height());
                    p.setActivityLevel(lp.activity() != null ? map(ACTIVITY, lp.activity(), "actividad") : null);
                    p.setGoal(lp.goal() != null ? map(GOAL, lp.goal(), "objetivo") : null);
                }
                if (n.targets() != null) {
                    LegacyBackup.Targets t = n.targets();
                    p.setTargetKcal(round(t.kcal(), NutritionProfile.DEFAULT_KCAL));
                    p.setTargetProtein(round(t.protein(), NutritionProfile.DEFAULT_PROTEIN));
                    p.setTargetCarbs(round(t.carbs(), NutritionProfile.DEFAULT_CARBS));
                    p.setTargetFat(round(t.fat(), NutritionProfile.DEFAULT_FAT));
                    p.setTargetFiber(round(t.fiber(), NutritionProfile.DEFAULT_FIBER));
                }
                profiles.save(p);
                profileImported = true;
            }
        }

        ImportResult result = new ImportResult(disciplineByOldId.size(), newChecks.size(), backup.tasks().size(),
                movementCount, foodCount, logCount, bodyCount, profileImported);
        log.info("Importación del usuario {}: {}", userId, result);
        return result;
    }

    private static <E> E map(Map<String, E> values, String raw, String field) {
        E value = raw == null ? null : values.get(raw.toLowerCase(Locale.ROOT));
        if (value == null) throw new BusinessRuleException("Valor desconocido en " + field + ": " + raw);
        return value;
    }

    private static LocalDate parseDate(String s) {
        try {
            return LocalDate.parse(s);
        } catch (DateTimeParseException e) {
            throw new BusinessRuleException("Fecha inválida en el respaldo: " + s);
        }
    }

    private static boolean sameValues(Food global, LegacyBackup.Food f) {
        return eq(global.getPortion(), f.per()) && eq(global.getKcal(), f.kcal())
                && eq(global.getProtein(), f.protein()) && eq(global.getCarbs(), f.carbs())
                && eq(global.getFat(), f.fat()) && eq(global.getFiber(), f.fiber());
    }

    private static boolean eq(BigDecimal a, BigDecimal b) {
        return orZero(a).compareTo(orZero(b)) == 0;
    }

    private static int round(BigDecimal v, int fallback) {
        return v == null ? fallback : v.setScale(0, RoundingMode.HALF_UP).intValue();
    }

    private static String key(String name) {
        return name.trim().toLowerCase(Locale.ROOT);
    }

    private static BigDecimal orZero(BigDecimal v) {
        return v != null ? v : BigDecimal.ZERO;
    }

    private static String truncate(String s, int max) {
        return s == null || s.length() <= max ? s : s.substring(0, max);
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
