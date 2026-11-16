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

/** Bs por unidad de divisa en una fecha. BCV = global (sin usuario); MANUAL = del usuario. */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "exchange_rates")
public class ExchangeRate extends BaseEntity {

    @Column(name = "user_id", updatable = false)
    private UUID userId;

    @Column(name = "rate_date", nullable = false, updatable = false)
    private LocalDate date;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, updatable = false)
    private RateCurrency currency;

    @Column(nullable = false, precision = 19, scale = 6)
    private BigDecimal rate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, updatable = false)
    private RateSource source;

    public ExchangeRate(UUID userId, LocalDate date, RateCurrency currency, BigDecimal rate, RateSource source) {
        this.userId = userId;
        this.date = date;
        this.currency = currency;
        this.rate = rate;
        this.source = source;
    }
}
