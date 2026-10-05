package com.planificacion.api.export;

import com.planificacion.api.common.error.NotFoundException;
import com.planificacion.api.config.ClockConfig;
import com.planificacion.api.discipline.Discipline;
import com.planificacion.api.discipline.DisciplineRepository;
import com.planificacion.api.export.ExcelCharts.Series;
import com.planificacion.api.finance.Account;
import com.planificacion.api.finance.Currency;
import com.planificacion.api.finance.ExpenseClass;
import com.planificacion.api.finance.ExpenseReason;
import com.planificacion.api.finance.FinanceMath;
import com.planificacion.api.finance.IncomeType;
import com.planificacion.api.finance.Movement;
import com.planificacion.api.finance.MovementKind;
import com.planificacion.api.finance.MovementRepository;
import com.planificacion.api.nutrition.BodyMeasurement;
import com.planificacion.api.nutrition.BodyMeasurementRepository;
import com.planificacion.api.nutrition.FoodLogEntry;
import com.planificacion.api.nutrition.FoodLogEntryRepository;
import com.planificacion.api.nutrition.FoodUnit;
import com.planificacion.api.nutrition.Meal;
import com.planificacion.api.nutrition.NutritionProfile;
import com.planificacion.api.nutrition.NutritionProfileRepository;
import com.planificacion.api.planning.CompletionLevel;
import com.planificacion.api.planning.DisciplineCheckRepository;
import com.planificacion.api.task.Task;
import com.planificacion.api.task.TaskPriority;
import com.planificacion.api.task.TaskRepository;
import com.planificacion.api.task.TaskStatus;
import com.planificacion.api.user.AccountType;
import com.planificacion.api.user.User;
import com.planificacion.api.user.UserRepository;
import org.apache.poi.xssf.usermodel.XSSFSheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.UUID;

import static com.planificacion.api.export.ExcelCharts.column;

/**
 * Informe en Excel con todos los datos del usuario: una hoja de resumen con indicadores y gráficos
 * y una hoja por módulo con el detalle. Las cuentas de empresa no llevan finanzas ni nutrición.
 */
@Service
public class ExcelExportService {

    /** Días de comidas que entran en el informe. */
    private static final int DIARY_DAYS = 90;
    /** Columna donde empiezan los gráficos del resumen (a la derecha de las tablas). */
    private static final int CHART_COL = 5;

    private static final DateTimeFormatter DAY_MONTH = DateTimeFormatter.ofPattern("dd/MM");
    private static final DateTimeFormatter FULL_DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final String[] MONTHS = {"Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"};
    private static final String[] WEEKDAYS = {"Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"};

    private static final Map<TaskStatus, String> STATUS = Map.of(
            TaskStatus.PENDING, "Pendiente", TaskStatus.IN_PROGRESS, "En progreso", TaskStatus.COMPLETED, "Completada");
    private static final Map<TaskPriority, String> PRIORITY = Map.of(
            TaskPriority.HIGH, "Alta", TaskPriority.MEDIUM, "Media", TaskPriority.LOW, "Baja");
    private static final Map<CompletionLevel, String> LEVEL = Map.of(
            CompletionLevel.GREEN, "Completo", CompletionLevel.YELLOW, "A medias",
            CompletionLevel.RED, "Bajo", CompletionLevel.NONE, "Sin datos");
    private static final Map<Account, String> ACCOUNT = Map.of(
            Account.ZELLE, "Zelle", Account.CASH_USD, "Efectivo $", Account.USDT, "USDT",
            Account.CASH_VES, "Efectivo Bs", Account.BANK_TRANSFER, "Transferencia", Account.PAGO_MOVIL, "Pago Móvil");
    private static final Map<IncomeType, String> INCOME = Map.of(
            IncomeType.SALARY, "Sueldo / Salario", IncomeType.SALE, "Venta", IncomeType.SERVICE, "Servicio / Trabajo",
            IncomeType.EXCHANGE, "Cambio de divisas", IncomeType.GIFT, "Regalo", IncomeType.LOAN, "Préstamo recibido",
            IncomeType.REFUND, "Reembolso / Devolución", IncomeType.OTHER, "Otro");
    private static final Map<ExpenseReason, String> REASON = Map.of(
            ExpenseReason.PURCHASE, "Compra", ExpenseReason.PAYMENT, "Pago (servicio, deuda…)",
            ExpenseReason.CURRENCY_SALE, "Venta de divisas", ExpenseReason.EXCHANGE, "Cambio entre cuentas",
            ExpenseReason.OTHER, "Otro");
    private static final Map<ExpenseClass, String> EXPENSE_CLASS = Map.of(
            ExpenseClass.EXPENSE, "Gasto", ExpenseClass.COST, "Costo");
    private static final Map<Meal, String> MEAL = Map.of(
            Meal.BREAKFAST, "Desayuno", Meal.LUNCH, "Almuerzo", Meal.DINNER, "Cena", Meal.SNACK, "Merienda");
    private static final Map<FoodUnit, String> UNIT = Map.of(FoodUnit.G, "g", FoodUnit.ML, "ml", FoodUnit.UNIT, "unidad");

    private final UserRepository users;
    private final DisciplineRepository disciplines;
    private final DisciplineCheckRepository checks;
    private final TaskRepository tasks;
    private final MovementRepository movements;
    private final FoodLogEntryRepository foodLog;
    private final BodyMeasurementRepository body;
    private final NutritionProfileRepository profiles;
    private final Clock clock;

    public ExcelExportService(UserRepository users, DisciplineRepository disciplines, DisciplineCheckRepository checks,
                              TaskRepository tasks, MovementRepository movements, FoodLogEntryRepository foodLog,
                              BodyMeasurementRepository body, NutritionProfileRepository profiles, Clock clock) {
        this.users = users;
        this.disciplines = disciplines;
        this.checks = checks;
        this.tasks = tasks;
        this.movements = movements;
        this.foodLog = foodLog;
        this.body = body;
        this.profiles = profiles;
        this.clock = clock;
    }

    /** Todo lo que necesitan las hojas, cargado una sola vez. */
    private record Data(User user, LocalDate today, boolean personal,
                        List<Discipline> disciplines, LocalDate start, Map<LocalDate, Set<UUID>> doneByDay,
                        List<Task> tasks, List<Movement> movements,
                        List<FoodLogEntry> diary, int targetKcal, List<BodyMeasurement> body) {

        /** Disciplinas cumplidas entre dos fechas (ambas incluidas). */
        int done(LocalDate from, LocalDate to) {
            int total = 0;
            for (LocalDate d = from; !d.isAfter(to); d = d.plusDays(1)) total += doneOn(d).size();
            return total;
        }

        Set<UUID> doneOn(LocalDate day) {
            return doneByDay.getOrDefault(day, Set.of());
        }

        /** Disciplinas que se podían cumplir en el rango: solo cuentan los días desde que empezaste hasta hoy. */
        int possible(LocalDate from, LocalDate to) {
            LocalDate first = from.isBefore(start) ? start : from;
            LocalDate last = to.isAfter(today) ? today : to;
            if (first.isAfter(last)) return 0;
            return (int) (ChronoUnit.DAYS.between(first, last) + 1) * disciplines.size();
        }

        double ratio(LocalDate from, LocalDate to) {
            int possible = possible(from, to);
            return possible == 0 ? 0 : (double) done(from.isBefore(start) ? start : from, to) / possible;
        }
    }

    @Transactional(readOnly = true)
    public byte[] export(UUID userId) {
        Data data = load(userId);
        try (XSSFWorkbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            ExcelStyles st = new ExcelStyles(wb);
            summarySheet(wb, st, data);
            planningSheet(wb, st, data);
            disciplinesSheet(wb, st, data);
            tasksSheet(wb, st, data);
            if (data.personal()) {
                movementsSheet(wb, st, data);
                nutritionSheet(wb, st, data);
                diarySheet(wb, st, data);
                bodySheet(wb, st, data);
            }
            wb.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new IllegalStateException("No se pudo generar el Excel", e);
        }
    }

    private Data load(UUID userId) {
        User user = users.findById(userId).orElseThrow(() -> new NotFoundException("Usuario"));
        LocalDate today = LocalDate.now(clock);
        boolean personal = user.getAccountType() != AccountType.BUSINESS;

        List<Discipline> active = disciplines.findByUserIdAndArchivedFalseOrderByPositionAscCreatedAtAsc(userId);
        LocalDate start = checks.findFirstCheckDate(userId).filter(d -> !d.isAfter(today)).orElse(today);
        Map<LocalDate, Set<UUID>> doneByDay = new HashMap<>();
        for (DisciplineCheckRepository.CheckView c : checks.findActiveInRange(userId, start, today)) {
            doneByDay.computeIfAbsent(c.getDate(), d -> new HashSet<>()).add(c.getDisciplineId());
        }

        List<Task> allTasks = tasks.findByUserIdAndStatusInOrderByDeadlineAsc(userId, EnumSet.allOf(TaskStatus.class));

        List<Movement> allMovements = List.of();
        List<FoodLogEntry> diary = List.of();
        List<BodyMeasurement> measurements = List.of();
        int targetKcal = NutritionProfile.DEFAULT_KCAL;
        if (personal) {
            allMovements = new ArrayList<>(movements.findByUserId(userId));
            allMovements.sort(Comparator.comparing(Movement::getDate).thenComparing(Movement::getCreatedAt).reversed());
            diary = new ArrayList<>(foodLog.findByUserIdAndDateBetween(userId, today.minusDays(DIARY_DAYS - 1), today));
            diary.sort(Comparator.comparing(FoodLogEntry::getDate).reversed()
                    .thenComparing(FoodLogEntry::getMeal).thenComparing(FoodLogEntry::getCreatedAt));
            measurements = body.findByUserIdOrderByDateAsc(userId);
            targetKcal = profiles.findById(userId).map(NutritionProfile::getTargetKcal).orElse(targetKcal);
        }
        return new Data(user, today, personal, active, start, doneByDay, allTasks, allMovements, diary, targetKcal,
                measurements);
    }

    // ------------------------------------------------------------- resumen

    private void summarySheet(XSSFWorkbook wb, ExcelStyles st, Data d) {
        XSSFSheet sh = wb.createSheet("Resumen");
        ExcelStyles.widths(sh, 34, 16, 16, 16, 3);
        LocalDate today = d.today();

        st.put(sh, 0, 0, "Planificación diaria · Informe", st.title);
        st.put(sh, 1, 0, d.user().getFullName() + " · generado el " + FULL_DATE.format(today), st.subtitle);

        int r = 3;
        st.put(sh, r++, 0, "Indicadores", st.section);
        st.headers(sh, r++, "Indicador", "Valor");
        r = indicator(sh, st, r, "Disciplinas activas", d.disciplines().size(), st.integer);
        r = indicator(sh, st, r, "Cumplimiento de hoy", d.ratio(today, today), st.percent);
        r = indicator(sh, st, r, "Cumplimiento últimos 7 días", d.ratio(today.minusDays(6), today), st.percent);
        r = indicator(sh, st, r, "Cumplimiento últimos 30 días", d.ratio(today.minusDays(29), today), st.percent);
        long open = d.tasks().stream().filter(t -> t.getStatus() != TaskStatus.COMPLETED).count();
        long overdue = d.tasks().stream()
                .filter(t -> t.getStatus() != TaskStatus.COMPLETED && t.getDeadline().isBefore(today)).count();
        r = indicator(sh, st, r, "Pendientes por hacer", open, st.integer);
        r = indicator(sh, st, r, "Pendientes vencidos", overdue, st.integer);
        if (d.personal()) {
            YearMonth month = YearMonth.from(today);
            double in = usd(d, month, MovementKind.INCOME);
            double out = usd(d, month, MovementKind.EXPENSE);
            r = indicator(sh, st, r, "Entradas del mes ($)", in, st.money);
            r = indicator(sh, st, r, "Salidas del mes ($)", out, st.money);
            r = indicator(sh, st, r, "Balance del mes ($)", in - out, st.moneyBold);
            if (!d.body().isEmpty()) {
                r = indicator(sh, st, r, "Peso actual (kg)", d.body().getLast().getWeightKg().doubleValue(), st.decimal);
            }
        }
        r += 2;

        // Cumplimiento de los últimos 12 meses
        int top = r;
        st.put(sh, r++, 0, "Cumplimiento por mes", st.section);
        st.headers(sh, r++, "Mes", "Cumplidas", "Posibles", "Cumplimiento");
        int first = r;
        for (int i = 11; i >= 0; i--) {
            YearMonth ym = YearMonth.from(today).minusMonths(i);
            LocalDate from = ym.atDay(1);
            LocalDate to = ym.atEndOfMonth().isAfter(today) ? today : ym.atEndOfMonth();
            int possible = d.possible(from, to);
            st.put(sh, r, 0, MONTHS[ym.getMonthValue() - 1] + " " + ym.getYear(), st.text);
            st.put(sh, r, 1, possible == 0 ? 0 : d.done(from.isBefore(d.start()) ? d.start() : from, to), st.integer);
            st.put(sh, r, 2, possible, st.integer);
            st.put(sh, r, 3, d.ratio(from, to), st.percent);
            r++;
        }
        ExcelCharts.bars(sh, top, CHART_COL, "Cumplimiento por mes", ExcelCharts.labels(sh, column(first, r - 1, 0)),
                List.of(new Series("Cumplimiento", column(first, r - 1, 3), ExcelStyles.TEAL)), true);
        r = Math.max(r, top + ExcelCharts.ROWS) + 2;

        // Cumplimiento por disciplina desde el primer día registrado
        if (!d.disciplines().isEmpty()) {
            top = r;
            st.put(sh, r++, 0, "Cumplimiento por disciplina", st.section);
            st.headers(sh, r++, "Disciplina", "Días cumplidos", "Días contados", "Cumplimiento");
            first = r;
            int days = (int) ChronoUnit.DAYS.between(d.start(), today) + 1;
            for (Discipline disc : d.disciplines()) {
                int done = daysDone(d, disc);
                st.put(sh, r, 0, disc.getName(), st.text);
                st.put(sh, r, 1, done, st.integer);
                st.put(sh, r, 2, days, st.integer);
                st.put(sh, r, 3, (double) done / days, st.percent);
                r++;
            }
            ExcelCharts.bars(sh, top, CHART_COL, "Cumplimiento por disciplina",
                    ExcelCharts.labels(sh, column(first, r - 1, 0)),
                    List.of(new Series("Cumplimiento", column(first, r - 1, 3), "14A08F")), true);
            r = Math.max(r, top + ExcelCharts.ROWS) + 2;
        }

        // Pendientes por estado
        top = r;
        st.put(sh, r++, 0, "Pendientes por estado", st.section);
        st.headers(sh, r++, "Estado", "Cantidad");
        first = r;
        long mostTasks = 0;
        for (TaskStatus status : TaskStatus.values()) {
            long count = d.tasks().stream().filter(t -> t.getStatus() == status).count();
            mostTasks = Math.max(mostTasks, count);
            st.put(sh, r, 0, STATUS.get(status), st.text);
            st.put(sh, r, 1, count, st.integer);
            r++;
        }
        ExcelCharts.bars(sh, top, CHART_COL, "Pendientes por estado", ExcelCharts.labels(sh, column(first, r - 1, 0)),
                List.of(new Series("Pendientes", column(first, r - 1, 1), ExcelStyles.AMBER)), false, mostTasks);
        r = Math.max(r, top + ExcelCharts.ROWS) + 2;

        if (!d.personal()) return;

        // Entradas y salidas de los últimos 6 meses, en dólares y sin cambios de divisas
        top = r;
        st.put(sh, r++, 0, "Entradas y salidas (últimos 6 meses, en $)", st.section);
        st.headers(sh, r++, "Mes", "Entradas", "Salidas", "Balance");
        first = r;
        for (int i = 5; i >= 0; i--) {
            YearMonth ym = YearMonth.from(today).minusMonths(i);
            double in = usd(d, ym, MovementKind.INCOME);
            double out = usd(d, ym, MovementKind.EXPENSE);
            st.put(sh, r, 0, MONTHS[ym.getMonthValue() - 1] + " " + ym.getYear(), st.text);
            st.put(sh, r, 1, in, st.money);
            st.put(sh, r, 2, out, st.money);
            st.put(sh, r, 3, in - out, st.moneyBold);
            r++;
        }
        ExcelCharts.bars(sh, top, CHART_COL, "Entradas y salidas ($)", ExcelCharts.labels(sh, column(first, r - 1, 0)),
                List.of(new Series("Entradas", column(first, r - 1, 1), ExcelStyles.TEAL),
                        new Series("Salidas", column(first, r - 1, 2), ExcelStyles.CORAL)), false);
        r = Math.max(r, top + ExcelCharts.ROWS) + 2;

        // Saldo de cada cuenta en su moneda
        st.put(sh, r++, 0, "Saldo por cuenta", st.section);
        st.headers(sh, r++, "Cuenta", "Moneda", "Saldo");
        Map<Account, BigDecimal> balances = new EnumMap<>(Account.class);
        for (Movement m : d.movements()) balances.merge(m.getAccount(), m.signedAmount(), BigDecimal::add);
        for (Account account : Account.values()) {
            st.put(sh, r, 0, ACCOUNT.get(account), st.text);
            st.put(sh, r, 1, currencyLabel(account), st.centered);
            st.put(sh, r, 2, balances.getOrDefault(account, BigDecimal.ZERO), st.money);
            r++;
        }
    }

    private static int indicator(XSSFSheet sh, ExcelStyles st, int row, String label, double value,
                                 org.apache.poi.ss.usermodel.CellStyle style) {
        st.put(sh, row, 0, label, st.text);
        st.put(sh, row, 1, value, style);
        return row + 1;
    }

    /** Días en que se cumplió una disciplina desde el primer registro. */
    private static int daysDone(Data d, Discipline disc) {
        return (int) d.doneByDay().values().stream().filter(ids -> ids.contains(disc.getId())).count();
    }

    /** Total del mes en dólares, sin contar cambios de divisas (no son ingresos ni gastos reales). */
    private static double usd(Data d, YearMonth month, MovementKind kind) {
        return d.movements().stream()
                .filter(m -> m.getKind() == kind && !m.isTransfer() && YearMonth.from(m.getDate()).equals(month))
                .map(m -> FinanceMath.toUsd(m.getAccount(), m.getAmount(), m.getRateUsd()))
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .doubleValue();
    }

    private static String currencyLabel(Account account) {
        if (account == Account.USDT) return "USDT";
        return account.currency() == Currency.USD ? "$" : "Bs";
    }

    // ------------------------------------------------------ planificación

    private void planningSheet(XSSFWorkbook wb, ExcelStyles st, Data d) {
        XSSFSheet sh = wb.createSheet("Planificación");
        List<Discipline> list = d.disciplines();
        int n = list.size();

        String[] headers = new String[2 + n + 4];
        headers[0] = "Fecha";
        headers[1] = "Día";
        // Solo el nombre: los emojis en el encabezado pierden el color blanco al imprimir o exportar a PDF.
        for (int i = 0; i < n; i++) headers[2 + i] = list.get(i).getName();
        headers[2 + n] = "Cumplidas";
        headers[3 + n] = "Total";
        headers[4 + n] = "Cumplimiento";
        headers[5 + n] = "Nivel";
        st.headers(sh, 0, headers);

        int r = 1;
        for (LocalDate day = d.today(); !day.isBefore(d.start()); day = day.minusDays(1)) {
            Set<UUID> done = d.doneOn(day);
            st.put(sh, r, 0, day);
            st.put(sh, r, 1, WEEKDAYS[day.getDayOfWeek().getValue() - 1], st.text);
            int count = 0;
            for (int i = 0; i < n; i++) {
                boolean ok = done.contains(list.get(i).getId());
                if (ok) count++;
                st.put(sh, r, 2 + i, ok ? "✓" : "", ok ? st.done : st.centered);
            }
            st.put(sh, r, 2 + n, count, st.integer);
            st.put(sh, r, 3 + n, n, st.integer);
            st.put(sh, r, 4 + n, n == 0 ? 0 : (double) count / n, st.percent);
            st.put(sh, r, 5 + n, LEVEL.get(CompletionLevel.of(count, n)), st.text);
            r++;
        }

        int[] widths = new int[headers.length];
        widths[0] = 13;
        widths[1] = 12;
        for (int i = 0; i < n; i++) widths[2 + i] = 16;
        widths[2 + n] = 11;
        widths[3 + n] = 8;
        widths[4 + n] = 14;
        widths[5 + n] = 12;
        ExcelStyles.widths(sh, widths);
        st.asTable(sh, 0, r - 1, headers.length);
    }

    private void disciplinesSheet(XSSFWorkbook wb, ExcelStyles st, Data d) {
        XSSFSheet sh = wb.createSheet("Disciplinas");
        st.headers(sh, 0, "Icono", "Nombre", "Descripción", "Días cumplidos", "Cumplimiento");
        int days = (int) ChronoUnit.DAYS.between(d.start(), d.today()) + 1;
        int r = 1;
        for (Discipline disc : d.disciplines()) {
            int done = daysDone(d, disc);
            st.put(sh, r, 0, disc.getIcon(), st.centered);
            st.put(sh, r, 1, disc.getName(), st.bold);
            st.put(sh, r, 2, disc.getDescription(), st.wrapped);
            st.put(sh, r, 3, done, st.integer);
            st.put(sh, r, 4, (double) done / days, st.percent);
            r++;
        }
        ExcelStyles.widths(sh, 8, 28, 50, 16, 14);
        st.asTable(sh, 0, r - 1, 5);
    }

    // ---------------------------------------------------------- pendientes

    private void tasksSheet(XSSFWorkbook wb, ExcelStyles st, Data d) {
        XSSFSheet sh = wb.createSheet("Pendientes");
        st.headers(sh, 0, "Nombre", "Descripción", "Estado", "Prioridad", "Fecha límite", "Días restantes", "Completada el");
        int r = 1;
        for (Task t : d.tasks()) {
            boolean completed = t.getStatus() == TaskStatus.COMPLETED;
            st.put(sh, r, 0, t.getName(), st.bold);
            st.put(sh, r, 1, t.getDescription(), st.wrapped);
            st.put(sh, r, 2, STATUS.get(t.getStatus()), st.text);
            st.put(sh, r, 3, PRIORITY.get(t.getPriority()), st.text);
            st.put(sh, r, 4, t.getDeadline());
            // Negativo = vencida hace esos días
            if (completed) st.put(sh, r, 5, "", st.integer);
            else st.put(sh, r, 5, ChronoUnit.DAYS.between(d.today(), t.getDeadline()), st.integer);
            st.put(sh, r, 6, t.getCompletedAt() == null ? null : LocalDate.ofInstant(t.getCompletedAt(), ClockConfig.ZONE));
            r++;
        }
        ExcelStyles.widths(sh, 34, 50, 14, 12, 14, 14, 15);
        st.asTable(sh, 0, r - 1, 7);
    }

    // ------------------------------------------------------------ finanzas

    private void movementsSheet(XSSFWorkbook wb, ExcelStyles st, Data d) {
        XSSFSheet sh = wb.createSheet("Movimientos");
        st.headers(sh, 0, "Fecha", "Tipo", "Cuenta", "Moneda", "Monto", "Equivalente $", "Equivalente Bs",
                "Clasificación", "Categoría", "Motivo / tipo de ingreso", "Descripción", "Tasa BCV $", "Tasa USDT",
                "Cambio de divisas");
        int r = 1;
        for (Movement m : d.movements()) {
            boolean income = m.getKind() == MovementKind.INCOME;
            String motive = income
                    ? (m.getIncomeType() == null ? "" : INCOME.get(m.getIncomeType()))
                    : (m.getExpenseReason() == null ? "" : REASON.get(m.getExpenseReason()));
            st.put(sh, r, 0, m.getDate());
            st.put(sh, r, 1, income ? "Entrada" : "Salida", st.text);
            st.put(sh, r, 2, ACCOUNT.get(m.getAccount()), st.text);
            st.put(sh, r, 3, currencyLabel(m.getAccount()), st.centered);
            st.put(sh, r, 4, m.getAmount(), st.money);
            st.put(sh, r, 5, FinanceMath.toUsd(m.getAccount(), m.getAmount(), m.getRateUsd()), st.money);
            st.put(sh, r, 6, FinanceMath.toBs(m.getAccount(), m.getAmount(), m.getRateUsd(), m.getUsdtRate()), st.money);
            st.put(sh, r, 7, m.getExpenseClass() == null ? "" : EXPENSE_CLASS.get(m.getExpenseClass()), st.text);
            st.put(sh, r, 8, m.getCategory(), st.text);
            st.put(sh, r, 9, motive, st.text);
            st.put(sh, r, 10, m.getDescription(), st.text);
            st.put(sh, r, 11, m.getRateUsd(), st.money);
            st.put(sh, r, 12, m.getUsdtRate(), st.money);
            st.put(sh, r, 13, m.isTransfer() ? "Sí" : "No", st.centered);
            r++;
        }
        ExcelStyles.widths(sh, 13, 10, 16, 10, 14, 15, 16, 14, 18, 26, 36, 12, 12, 12);
        st.asTable(sh, 0, r - 1, 14);
    }

    // ----------------------------------------------------------- nutrición

    /** Totales por día (solo los días con comidas registradas) y su gráfico frente al objetivo. */
    private void nutritionSheet(XSSFWorkbook wb, ExcelStyles st, Data d) {
        XSSFSheet sh = wb.createSheet("Nutrición");
        st.headers(sh, 0, "Fecha", "Calorías", "Proteína (g)", "Carbohidratos (g)", "Grasa (g)", "Fibra (g)", "Objetivo kcal");

        Map<LocalDate, BigDecimal[]> byDay = new TreeMap<>();
        for (FoodLogEntry e : d.diary()) {
            BigDecimal[] sum = byDay.computeIfAbsent(e.getDate(), k -> new BigDecimal[]{
                    BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO});
            sum[0] = sum[0].add(e.getKcal());
            sum[1] = sum[1].add(e.getProtein());
            sum[2] = sum[2].add(e.getCarbs());
            sum[3] = sum[3].add(e.getFat());
            sum[4] = sum[4].add(e.getFiber());
        }

        int r = 1;
        List<String> labels = new ArrayList<>();
        for (Map.Entry<LocalDate, BigDecimal[]> day : byDay.entrySet()) {
            st.put(sh, r, 0, day.getKey());
            for (int i = 0; i < 5; i++) st.put(sh, r, 1 + i, day.getValue()[i], i == 0 ? st.integer : st.decimal);
            st.put(sh, r, 6, d.targetKcal(), st.integer);
            labels.add(DAY_MONTH.format(day.getKey()));
            r++;
        }
        ExcelStyles.widths(sh, 13, 12, 13, 18, 12, 12, 14, 3);
        st.asTable(sh, 0, r - 1, 7);
        if (!labels.isEmpty()) {
            ExcelCharts.lines(sh, 1, 8, "Calorías por día (últimos " + DIARY_DAYS + " días)", ExcelCharts.labels(labels),
                    List.of(new Series("Calorías", column(1, r - 1, 1), ExcelStyles.CORAL),
                            new Series("Objetivo", column(1, r - 1, 6), ExcelStyles.GREY)));
        }
    }

    private void diarySheet(XSSFWorkbook wb, ExcelStyles st, Data d) {
        XSSFSheet sh = wb.createSheet("Diario de comidas");
        st.headers(sh, 0, "Fecha", "Comida", "Alimento", "Cantidad", "Unidad", "Calorías", "Proteína (g)",
                "Carbohidratos (g)", "Grasa (g)", "Fibra (g)");
        int r = 1;
        for (FoodLogEntry e : d.diary()) {
            st.put(sh, r, 0, e.getDate());
            st.put(sh, r, 1, MEAL.get(e.getMeal()), st.text);
            st.put(sh, r, 2, e.getName(), st.bold);
            st.put(sh, r, 3, e.getAmount(), st.decimal);
            st.put(sh, r, 4, UNIT.get(e.getUnit()), st.text);
            st.put(sh, r, 5, e.getKcal(), st.integer);
            st.put(sh, r, 6, e.getProtein(), st.decimal);
            st.put(sh, r, 7, e.getCarbs(), st.decimal);
            st.put(sh, r, 8, e.getFat(), st.decimal);
            st.put(sh, r, 9, e.getFiber(), st.decimal);
            r++;
        }
        ExcelStyles.widths(sh, 13, 12, 34, 11, 10, 11, 13, 18, 11, 11);
        st.asTable(sh, 0, r - 1, 10);
    }

    private void bodySheet(XSSFWorkbook wb, ExcelStyles st, Data d) {
        XSSFSheet sh = wb.createSheet("Cuerpo");
        st.headers(sh, 0, "Fecha", "Peso (kg)", "% de grasa", "Masa magra (kg)", "Masa grasa (kg)", "Cintura (cm)", "Nota");
        int r = 1;
        List<String> labels = new ArrayList<>();
        boolean anyFat = false;
        for (BodyMeasurement b : d.body()) {
            st.put(sh, r, 0, b.getDate());
            st.put(sh, r, 1, b.getWeightKg(), st.decimal);
            st.put(sh, r, 2, b.getBodyFatPct(), st.decimal);
            st.put(sh, r, 3, b.leanMassKg(), st.decimal);
            st.put(sh, r, 4, b.fatMassKg(), st.decimal);
            st.put(sh, r, 5, b.getWaistCm(), st.decimal);
            st.put(sh, r, 6, b.getNote(), st.text);
            labels.add(DAY_MONTH.format(b.getDate()));
            anyFat |= b.getBodyFatPct() != null;
            r++;
        }
        ExcelStyles.widths(sh, 13, 12, 12, 16, 16, 13, 36, 3);
        st.asTable(sh, 0, r - 1, 7);
        if (labels.isEmpty()) return;
        ExcelCharts.lines(sh, 1, 8, "Peso (kg)", ExcelCharts.labels(labels),
                List.of(new Series("Peso", column(1, r - 1, 1), ExcelStyles.TEAL)));
        if (anyFat) {
            ExcelCharts.lines(sh, 1 + ExcelCharts.ROWS + 1, 8, "% de grasa", ExcelCharts.labels(labels),
                    List.of(new Series("% de grasa", column(1, r - 1, 2), ExcelStyles.RED)));
        }
    }
}
