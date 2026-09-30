package com.planificacion.api.finance;

import com.planificacion.api.common.error.BusinessRuleException;
import com.planificacion.api.common.error.ExternalServiceException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Limit;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

@Service
@Transactional
public class RateService {

    private static final Logger log = LoggerFactory.getLogger(RateService.class);

    private final ExchangeRateRepository repo;
    private final BcvRateClient bcv;
    private final Clock clock;

    public RateService(ExchangeRateRepository repo, BcvRateClient bcv, Clock clock) {
        this.repo = repo;
        this.bcv = bcv;
        this.clock = clock;
    }

    /** Tasas Bs/$ y Bs/€ vigentes para una fecha. */
    public record Rates(LocalDate date, BigDecimal usd, BigDecimal eur, RateSource source) {
    }

    /**
     * Tasa vigente para un usuario en una fecha: la más reciente en o antes de esa fecha.
     * Si el mismo día hay BCV y MANUAL, gana la manual del usuario.
     */
    @Transactional(readOnly = true)
    public Optional<Rates> ratesFor(UUID userId, LocalDate date) {
        Optional<ExchangeRate> usd = repo.findApplicable(userId, RateCurrency.USD, date, Limit.of(1)).stream().findFirst();
        Optional<ExchangeRate> eur = repo.findApplicable(userId, RateCurrency.EUR, date, Limit.of(1)).stream().findFirst();
        if (usd.isEmpty() || eur.isEmpty()) return Optional.empty();
        return Optional.of(new Rates(usd.get().getDate(), usd.get().getRate(), eur.get().getRate(), usd.get().getSource()));
    }

    @Transactional(readOnly = true)
    public Rates requireRatesFor(UUID userId, LocalDate date) {
        return ratesFor(userId, date).orElseThrow(() -> new BusinessRuleException(
                "No hay tasa BCV para " + date + ". Actualiza las tasas o envía rateUsd y rateEur."));
    }

    @Transactional(readOnly = true)
    public Optional<Rates> latest(UUID userId) {
        return ratesFor(userId, LocalDate.now(clock));
    }

    /** Descarga la tasa BCV y la guarda (o actualiza) como tasa global de ese día. */
    public Rates refreshFromBcv() {
        BcvRateClient.BcvRates fetched;
        try {
            fetched = bcv.fetch();
        } catch (RuntimeException e) {
            throw new ExternalServiceException("No se pudo obtener la tasa BCV. Intenta más tarde o escríbela a mano.", e);
        }
        upsertBcv(fetched.date(), RateCurrency.USD, fetched.usd());
        upsertBcv(fetched.date(), RateCurrency.EUR, fetched.eur());
        log.info("Tasa BCV {}: USD {} · EUR {}", fetched.date(), fetched.usd(), fetched.eur());
        return new Rates(fetched.date(), fetched.usd(), fetched.eur(), RateSource.BCV);
    }

    public Rates setManual(UUID userId, LocalDate date, BigDecimal usd, BigDecimal eur) {
        upsertManual(userId, date, RateCurrency.USD, usd);
        upsertManual(userId, date, RateCurrency.EUR, eur);
        return new Rates(date, usd, eur, RateSource.MANUAL);
    }

    /** El BCV publica en días hábiles; revisamos cada 3 horas. Un fallo no debe tumbar nada. */
    @Scheduled(cron = "0 5 */3 * * *", zone = "America/Caracas")
    public void scheduledRefresh() {
        try {
            refreshFromBcv();
        } catch (RuntimeException e) {
            log.warn("No se pudo actualizar la tasa BCV: {}", e.getMessage());
        }
    }

    private void upsertBcv(LocalDate date, RateCurrency currency, BigDecimal rate) {
        repo.findBySourceAndCurrencyAndDateAndUserIdIsNull(RateSource.BCV, currency, date)
                .ifPresentOrElse(r -> r.setRate(rate),
                        () -> repo.save(new ExchangeRate(null, date, currency, rate, RateSource.BCV)));
    }

    private void upsertManual(UUID userId, LocalDate date, RateCurrency currency, BigDecimal rate) {
        repo.findByUserIdAndSourceAndCurrencyAndDate(userId, RateSource.MANUAL, currency, date)
                .ifPresentOrElse(r -> r.setRate(rate),
                        () -> repo.save(new ExchangeRate(userId, date, currency, rate, RateSource.MANUAL)));
    }
}
