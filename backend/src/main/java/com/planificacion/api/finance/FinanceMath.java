package com.planificacion.api.finance;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Optional;

/** Cálculos puros de dinero (sin estado, fáciles de testear). */
public final class FinanceMath {

    /** Escala para montos mostrados (céntimos). */
    public static final int MONEY_SCALE = 2;
    /** Escala para tasas y divisiones intermedias. */
    public static final int RATE_SCALE = 6;

    private FinanceMath() {
    }

    /** Valor en $ de un monto de una cuenta (USDT = $ 1:1). */
    public static BigDecimal toUsd(Account account, BigDecimal amount, BigDecimal rateUsd) {
        if (account.currency() == Currency.USD) return amount.setScale(MONEY_SCALE, RoundingMode.HALF_UP);
        return amount.divide(rateUsd, MONEY_SCALE, RoundingMode.HALF_UP);
    }

    /** Valor en Bs. Para USDT usa la tasa de compra si existe; si no, la BCV. */
    public static BigDecimal toBs(Account account, BigDecimal amount, BigDecimal rateUsd, BigDecimal usdtRate) {
        if (account.currency() == Currency.VES) return amount.setScale(MONEY_SCALE, RoundingMode.HALF_UP);
        BigDecimal rate = account == Account.USDT && usdtRate != null ? usdtRate : rateUsd;
        return amount.multiply(rate).setScale(MONEY_SCALE, RoundingMode.HALF_UP);
    }

    /**
     * Tasa promedio (Bs por USDT) de los USDT que tienes, con costo promedio ponderado:
     * cada entrada con tasa recalcula el promedio; las salidas reducen la cantidad sin cambiarlo.
     *
     * @param usdtMovements movimientos de la cuenta USDT en orden cronológico
     */
    public static Optional<BigDecimal> usdtAverageRate(List<Movement> usdtMovements) {
        BigDecimal qty = BigDecimal.ZERO;
        BigDecimal avg = null;
        for (Movement m : usdtMovements) {
            if (m.getKind() == MovementKind.INCOME) {
                BigDecimal rate = m.getUsdtRate();
                if (rate != null && rate.signum() > 0) {
                    BigDecimal base = qty.max(BigDecimal.ZERO);
                    avg = avg == null
                            ? rate
                            : base.multiply(avg).add(m.getAmount().multiply(rate))
                                    .divide(base.add(m.getAmount()), RATE_SCALE, RoundingMode.HALF_UP);
                }
                qty = qty.add(m.getAmount());
            } else {
                qty = qty.subtract(m.getAmount());
            }
        }
        return Optional.ofNullable(avg).map(a -> a.setScale(RATE_SCALE, RoundingMode.HALF_UP));
    }
}
