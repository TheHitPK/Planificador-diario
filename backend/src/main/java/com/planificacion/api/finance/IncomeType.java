package com.planificacion.api.finance;

public enum IncomeType {
    SALARY,
    SALE,
    SERVICE,
    /** Lado de entrada de un cambio de divisas (lo crea el endpoint de cambios). */
    EXCHANGE,
    GIFT,
    LOAN,
    REFUND,
    OTHER
}
