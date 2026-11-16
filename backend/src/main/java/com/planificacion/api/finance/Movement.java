package com.planificacion.api.finance;

import com.planificacion.api.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Entrada o salida de dinero. Guarda las tasas BCV del día (snapshot) para que el valor
 * histórico en $ o Bs no cambie cuando cambia la tasa.
 */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "movements")
public class Movement extends BaseEntity {

    @Column(name = "user_id", nullable = false, updatable = false)
    private UUID userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, updatable = false)
    private MovementKind kind;

    @Column(name = "movement_date", nullable = false)
    private LocalDate date;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Account account;

    @Column(nullable = false, precision = 19, scale = 4)
    private BigDecimal amount;

    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "income_type")
    private IncomeType incomeType;

    @Enumerated(EnumType.STRING)
    @Column(name = "expense_reason")
    private ExpenseReason expenseReason;

    @Enumerated(EnumType.STRING)
    @Column(name = "expense_class")
    private ExpenseClass expenseClass;

    private String category;

    @Column(name = "rate_usd", nullable = false, precision = 19, scale = 6)
    private BigDecimal rateUsd;

    @Column(name = "rate_eur", nullable = false, precision = 19, scale = 6)
    private BigDecimal rateEur;

    @Column(name = "usdt_rate", precision = 19, scale = 6)
    private BigDecimal usdtRate;

    @Column(name = "transfer_group_id", updatable = false)
    private UUID transferGroupId;

    public Movement(UUID userId, MovementKind kind) {
        this.userId = userId;
        this.kind = kind;
    }

    /** Parte de un cambio / venta de divisas: no cuenta como ingreso ni gasto real. */
    public boolean isTransfer() {
        return transferGroupId != null;
    }

    /** +amount para entradas, -amount para salidas. */
    public BigDecimal signedAmount() {
        return kind == MovementKind.INCOME ? amount : amount.negate();
    }
}
