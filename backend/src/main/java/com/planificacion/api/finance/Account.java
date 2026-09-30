package com.planificacion.api.finance;

/** Dónde está el dinero. USDT se trata como dólar 1:1 para los totales. */
public enum Account {
    ZELLE(Currency.USD),
    CASH_USD(Currency.USD),
    USDT(Currency.USD),
    CASH_VES(Currency.VES),
    BANK_TRANSFER(Currency.VES),
    PAGO_MOVIL(Currency.VES);

    private final Currency currency;

    Account(Currency currency) {
        this.currency = currency;
    }

    public Currency currency() {
        return currency;
    }
}
