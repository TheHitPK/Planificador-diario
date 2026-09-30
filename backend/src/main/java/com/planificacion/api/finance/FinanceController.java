package com.planificacion.api.finance;

import com.planificacion.api.common.error.NotFoundException;
import com.planificacion.api.common.web.CurrentUserId;
import com.planificacion.api.finance.FinanceDtos.ExchangeRequest;
import com.planificacion.api.finance.FinanceDtos.ExchangeResponse;
import com.planificacion.api.finance.FinanceDtos.ManualRatesRequest;
import com.planificacion.api.finance.FinanceDtos.MovementRequest;
import com.planificacion.api.finance.FinanceDtos.MovementResponse;
import com.planificacion.api.finance.FinanceDtos.SummaryResponse;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.time.Clock;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/finance")
public class FinanceController {

    private final MovementService movements;
    private final FinanceSummaryService summary;
    private final RateService rates;
    private final Clock clock;

    public FinanceController(MovementService movements, FinanceSummaryService summary, RateService rates, Clock clock) {
        this.movements = movements;
        this.summary = summary;
        this.rates = rates;
        this.clock = clock;
    }

    // ---- Movimientos (entradas y salidas) ----

    /**
     * {@code GET /api/finance/movements?month=2026-09&kind=EXPENSE} — por defecto el mes actual.
     * Con {@code from} y {@code to} devuelve un rango arbitrario (el frontend carga todo para calcular saldos).
     */
    @GetMapping("/movements")
    public List<MovementResponse> list(@CurrentUserId UUID userId,
                                       @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM") YearMonth month,
                                       @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                       @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
                                       @RequestParam(required = false) MovementKind kind) {
        if (from != null && to != null) return movements.list(userId, from, to, kind);
        return movements.list(userId, month != null ? month : YearMonth.now(clock), kind);
    }

    @GetMapping("/movements/{id}")
    public MovementResponse get(@CurrentUserId UUID userId, @PathVariable UUID id) {
        return movements.get(userId, id);
    }

    @PostMapping("/movements")
    @ResponseStatus(HttpStatus.CREATED)
    public MovementResponse create(@CurrentUserId UUID userId, @Valid @RequestBody MovementRequest req) {
        return movements.create(userId, req);
    }

    @PutMapping("/movements/{id}")
    public MovementResponse update(@CurrentUserId UUID userId, @PathVariable UUID id,
                                   @Valid @RequestBody MovementRequest req) {
        return movements.update(userId, id, req);
    }

    @DeleteMapping("/movements/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@CurrentUserId UUID userId, @PathVariable UUID id) {
        movements.delete(userId, id);
    }

    // ---- Cambios / ventas de divisas ----

    @PostMapping("/exchanges")
    @ResponseStatus(HttpStatus.CREATED)
    public ExchangeResponse exchange(@CurrentUserId UUID userId, @Valid @RequestBody ExchangeRequest req) {
        return movements.createExchange(userId, req);
    }

    // ---- Resumen ----

    @GetMapping("/summary")
    public SummaryResponse summary(@CurrentUserId UUID userId,
                                   @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM") YearMonth month) {
        return summary.summary(userId, month != null ? month : YearMonth.now(clock));
    }

    // ---- Tasas ----

    /** Tasa vigente hoy (o en {@code date}). */
    @GetMapping("/rates")
    public RateService.Rates rates(@CurrentUserId UUID userId,
                                   @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        LocalDate d = date != null ? date : LocalDate.now(clock);
        return rates.ratesFor(userId, d).orElseThrow(() -> new NotFoundException("Tasa para " + d));
    }

    /** Fuerza la descarga de la tasa BCV del día. */
    @PostMapping("/rates/refresh")
    public RateService.Rates refreshRates() {
        return rates.refreshFromBcv();
    }

    /** Tasa escrita a mano (tiene prioridad sobre la BCV ese día, solo para ti). */
    @PutMapping("/rates/manual")
    public RateService.Rates manualRates(@CurrentUserId UUID userId, @Valid @RequestBody ManualRatesRequest req) {
        return rates.setManual(userId, req.date(), req.usd(), req.eur());
    }
}
