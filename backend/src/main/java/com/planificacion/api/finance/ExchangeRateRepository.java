package com.planificacion.api.finance;

import org.springframework.data.domain.Limit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ExchangeRateRepository extends JpaRepository<ExchangeRate, UUID> {

    Optional<ExchangeRate> findBySourceAndCurrencyAndDateAndUserIdIsNull(RateSource source, RateCurrency currency,
                                                                         LocalDate date);

    Optional<ExchangeRate> findByUserIdAndSourceAndCurrencyAndDate(UUID userId, RateSource source,
                                                                   RateCurrency currency, LocalDate date);

    /**
     * Tasas aplicables a un usuario en o antes de una fecha, la más reciente primero.
     * Incluye las BCV globales y las manuales del usuario.
     */
    @Query("""
            select r from ExchangeRate r
            where r.currency = :currency
              and r.date <= :date
              and (r.userId is null or r.userId = :userId)
            order by r.date desc, r.source desc
            """)
    List<ExchangeRate> findApplicable(@Param("userId") UUID userId, @Param("currency") RateCurrency currency,
                                      @Param("date") LocalDate date,
                                      Limit limit);
}
