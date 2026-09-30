package com.planificacion.api.finance;

import com.planificacion.api.finance.FinanceDtos.AccountBalance;
import com.planificacion.api.finance.FinanceDtos.CategoryTotal;
import com.planificacion.api.finance.FinanceDtos.MonthPoint;
import com.planificacion.api.finance.FinanceDtos.MonthStats;
import com.planificacion.api.finance.FinanceDtos.SummaryResponse;
import com.planificacion.api.finance.FinanceDtos.Totals;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.TreeMap;
import java.util.UUID;
import java.util.function.Predicate;

import static com.planificacion.api.finance.FinanceMath.MONEY_SCALE;

@Service
@Transactional(readOnly = true)
public class FinanceSummaryService {

    private final MovementRepository movements;
    private final RateService rates;

    public FinanceSummaryService(MovementRepository movements, RateService rates) {
        this.movements = movements;
        this.rates = rates;
    }

    /**
     * Carga todos los movimientos del usuario en memoria: para finanzas personales
     * (cientos o pocos miles de filas) es más simple y rápido que varias agregaciones SQL.
     */
    public SummaryResponse summary(UUID userId, YearMonth month) {
        List<Movement> all = movements.findByUserId(userId);
        Optional<RateService.Rates> current = rates.latest(userId);

        Map<Account, BigDecimal> balances = new EnumMap<>(Account.class);
        for (Account a : Account.values()) balances.put(a, BigDecimal.ZERO);
        for (Movement m : all) balances.merge(m.getAccount(), m.signedAmount(), BigDecimal::add);

        List<AccountBalance> accounts = new ArrayList<>();
        BigDecimal totalUsd = BigDecimal.ZERO;
        for (Account a : Account.values()) {
            BigDecimal bal = balances.get(a).setScale(MONEY_SCALE, RoundingMode.HALF_UP);
            BigDecimal usd = current.map(r -> FinanceMath.toUsd(a, bal, r.usd())).orElse(null);
            BigDecimal bs = current.map(r -> FinanceMath.toBs(a, bal, r.usd(), null)).orElse(null);
            accounts.add(new AccountBalance(a, a.currency(), bal, usd, bs));
            if (usd != null) totalUsd = totalUsd.add(usd);
        }

        Totals totals = null;
        if (current.isPresent()) {
            BigDecimal usd = totalUsd;
            BigDecimal bs = usd.multiply(current.get().usd()).setScale(MONEY_SCALE, RoundingMode.HALF_UP);
            totals = new Totals(usd, bs, bs.divide(current.get().eur(), MONEY_SCALE, RoundingMode.HALF_UP));
        }

        List<Movement> usdt = all.stream()
                .filter(m -> m.getAccount() == Account.USDT)
                .sorted(Comparator.comparing(Movement::getDate).thenComparing(Movement::getCreatedAt))
                .toList();

        return new SummaryResponse(current.orElse(null), accounts, totals,
                FinanceMath.usdtAverageRate(usdt).orElse(null),
                monthStats(all, month), lastSixMonths(all, month));
    }

    private static MonthStats monthStats(List<Movement> all, YearMonth month) {
        List<Movement> real = all.stream()
                .filter(m -> YearMonth.from(m.getDate()).equals(month) && !m.isTransfer())
                .toList();
        BigDecimal income = sumUsd(real, m -> m.getKind() == MovementKind.INCOME);
        BigDecimal expense = sumUsd(real, m -> m.getKind() == MovementKind.EXPENSE);
        BigDecimal expenses = sumUsd(real, m -> m.getExpenseClass() == ExpenseClass.EXPENSE);
        BigDecimal costs = sumUsd(real, m -> m.getExpenseClass() == ExpenseClass.COST);

        Map<String, BigDecimal> byCat = new TreeMap<>();
        real.stream().filter(m -> m.getKind() == MovementKind.EXPENSE).forEach(m ->
                byCat.merge(m.getCategory() == null ? "Otro" : m.getCategory(), usd(m), BigDecimal::add));
        List<CategoryTotal> categories = byCat.entrySet().stream()
                .map(e -> new CategoryTotal(e.getKey(), e.getValue()))
                .sorted(Comparator.comparing(CategoryTotal::usd).reversed())
                .toList();

        return new MonthStats(month.toString(), income, expense, income.subtract(expense), expenses, costs, categories);
    }

    private static List<MonthPoint> lastSixMonths(List<Movement> all, YearMonth end) {
        List<MonthPoint> points = new ArrayList<>();
        for (int i = 5; i >= 0; i--) {
            YearMonth ym = end.minusMonths(i);
            List<Movement> real = all.stream()
                    .filter(m -> YearMonth.from(m.getDate()).equals(ym) && !m.isTransfer())
                    .toList();
            points.add(new MonthPoint(ym.toString(),
                    sumUsd(real, m -> m.getKind() == MovementKind.INCOME),
                    sumUsd(real, m -> m.getKind() == MovementKind.EXPENSE)));
        }
        return points;
    }

    private static BigDecimal sumUsd(List<Movement> items, Predicate<Movement> filter) {
        return items.stream().filter(filter).map(FinanceSummaryService::usd)
                .reduce(BigDecimal.ZERO.setScale(MONEY_SCALE), BigDecimal::add);
    }

    private static BigDecimal usd(Movement m) {
        return FinanceMath.toUsd(m.getAccount(), m.getAmount(), m.getRateUsd());
    }
}
