package com.planificacion.api.finance;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class FinanceMathTest {

    private static final BigDecimal BCV = new BigDecimal("855.66");

    @Test
    void convierteBolivaresADolaresConLaTasaBcv() {
        assertThat(FinanceMath.toUsd(Account.PAGO_MOVIL, new BigDecimal("35000"), BCV)).isEqualByComparingTo("40.90");
        assertThat(FinanceMath.toUsd(Account.ZELLE, new BigDecimal("100"), BCV)).isEqualByComparingTo("100.00");
    }

    @Test
    void usdtSeValoraEnBolivaresASuTasaDeCompraSiExiste() {
        BigDecimal usdtRate = new BigDecimal("909.09");
        assertThat(FinanceMath.toBs(Account.USDT, BigDecimal.TEN, BCV, usdtRate)).isEqualByComparingTo("9090.90");
        assertThat(FinanceMath.toBs(Account.USDT, BigDecimal.TEN, BCV, null)).isEqualByComparingTo("8556.60");
    }

    @Test
    void promedioPonderadoDeCompraDeUsdt() {
        List<Movement> usdt = List.of(
                income("100", "900"),   // compro 100 a 900
                expense("40"),          // gasto 40 → quedan 60 a 900 (el promedio no cambia)
                income("40", "1000"));  // compro 40 a 1000 → (60·900 + 40·1000) / 100 = 940

        assertThat(FinanceMath.usdtAverageRate(usdt)).hasValueSatisfying(
                avg -> assertThat(avg).isEqualByComparingTo("940"));
    }

    @Test
    void sinComprasConTasaNoHayPromedio() {
        assertThat(FinanceMath.usdtAverageRate(List.of(income("50", null)))).isEmpty();
    }

    private static Movement income(String amount, String rate) {
        Movement m = new Movement(null, MovementKind.INCOME);
        m.setAccount(Account.USDT);
        m.setDate(LocalDate.of(2026, 9, 1));
        m.setAmount(new BigDecimal(amount));
        m.setUsdtRate(rate == null ? null : new BigDecimal(rate));
        return m;
    }

    private static Movement expense(String amount) {
        Movement m = new Movement(null, MovementKind.EXPENSE);
        m.setAccount(Account.USDT);
        m.setDate(LocalDate.of(2026, 9, 2));
        m.setAmount(new BigDecimal(amount));
        return m;
    }
}
