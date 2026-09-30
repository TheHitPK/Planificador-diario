package com.planificacion.api.finance;

import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public final class FinanceDtos {

    private FinanceDtos() {
    }

    /**
     * Entrada o salida normal. Los cambios/ventas de divisas van por {@link ExchangeRequest}.
     * Si no envías rateUsd/rateEur se usa la tasa vigente de esa fecha.
     */
    public record MovementRequest(
            @NotNull MovementKind kind,
            @NotNull LocalDate date,
            @NotNull Account account,
            @NotNull @Positive @Digits(integer = 15, fraction = 4) BigDecimal amount,
            @Size(max = 255) String description,
            IncomeType incomeType,
            ExpenseReason expenseReason,
            ExpenseClass expenseClass,
            @Size(max = 50) String category,
            @Positive BigDecimal rateUsd,
            @Positive BigDecimal rateEur,
            @Positive BigDecimal usdtRate) {
    }

    /** Sale dinero de una cuenta y entra en otra (ej. vender $100 Zelle y recibir Bs 85.000 por Pago Móvil). */
    public record ExchangeRequest(
            @NotNull LocalDate date,
            @NotNull ExpenseReason reason,
            @NotNull Account fromAccount,
            @NotNull @Positive @Digits(integer = 15, fraction = 4) BigDecimal fromAmount,
            @NotNull Account toAccount,
            @NotNull @Positive @Digits(integer = 15, fraction = 4) BigDecimal toAmount,
            @Size(max = 255) String description,
            @Positive BigDecimal rateUsd,
            @Positive BigDecimal rateEur,
            /* Si sale de USDT: tasa a la que se compraron (por defecto, tu promedio). */
            @Positive BigDecimal usdtCostRate) {
    }

    public record ManualRatesRequest(@NotNull LocalDate date, @NotNull @Positive BigDecimal usd,
                                     @NotNull @Positive BigDecimal eur) {
    }

    public record MovementResponse(
            UUID id, MovementKind kind, LocalDate date, Account account, Currency currency, BigDecimal amount,
            String description, IncomeType incomeType, ExpenseReason expenseReason, ExpenseClass expenseClass,
            String category, BigDecimal rateUsd, BigDecimal rateEur, BigDecimal usdtRate, UUID transferGroupId,
            boolean transfer, BigDecimal usdValue, BigDecimal bsValue) {

        public static MovementResponse from(Movement m) {
            return new MovementResponse(m.getId(), m.getKind(), m.getDate(), m.getAccount(), m.getAccount().currency(),
                    m.getAmount(), m.getDescription(), m.getIncomeType(), m.getExpenseReason(), m.getExpenseClass(),
                    m.getCategory(), m.getRateUsd(), m.getRateEur(), m.getUsdtRate(), m.getTransferGroupId(),
                    m.isTransfer(),
                    FinanceMath.toUsd(m.getAccount(), m.getAmount(), m.getRateUsd()),
                    FinanceMath.toBs(m.getAccount(), m.getAmount(), m.getRateUsd(), m.getUsdtRate()));
        }
    }

    /** {@code impliedRate}: Bs por $ (o por USDT) del cambio, si una cuenta es en $ y la otra en Bs. */
    public record ExchangeResponse(UUID transferGroupId, MovementResponse out, MovementResponse in,
                                   BigDecimal impliedRate) {
    }

    public record AccountBalance(Account account, Currency currency, BigDecimal balance, BigDecimal usdValue,
                                 BigDecimal bsValue) {
    }

    public record Totals(BigDecimal usd, BigDecimal bs, BigDecimal eur) {
    }

    public record CategoryTotal(String category, BigDecimal usd) {
    }

    /** Montos del mes en $ con la tasa de cada movimiento, sin contar cambios de divisas. */
    public record MonthStats(String month, BigDecimal income, BigDecimal expense, BigDecimal balance,
                             BigDecimal expenses, BigDecimal costs, List<CategoryTotal> byCategory) {
    }

    public record MonthPoint(String month, BigDecimal income, BigDecimal expense) {
    }

    public record SummaryResponse(RateService.Rates rates, List<AccountBalance> accounts, Totals totals,
                                  BigDecimal usdtAverageRate, MonthStats month, List<MonthPoint> lastSixMonths) {
    }
}
