package com.planificacion.api.finance;

public enum ExpenseReason {
    PURCHASE,
    PAYMENT,
    /** Vender divisas (ej. $ Zelle → Bs Pago Móvil). */
    CURRENCY_SALE,
    /** Mover dinero entre cuentas (ej. Bs → USDT). */
    EXCHANGE,
    OTHER;

    /** Solo mueve dinero entre cuentas: no es gasto ni ingreso real. */
    public boolean isTransfer() {
        return this == CURRENCY_SALE || this == EXCHANGE;
    }
}
