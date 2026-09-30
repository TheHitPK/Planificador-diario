package com.planificacion.api.finance;

import com.planificacion.api.common.error.BusinessRuleException;
import com.planificacion.api.common.error.NotFoundException;
import com.planificacion.api.finance.FinanceDtos.ExchangeRequest;
import com.planificacion.api.finance.FinanceDtos.ExchangeResponse;
import com.planificacion.api.finance.FinanceDtos.MovementRequest;
import com.planificacion.api.finance.FinanceDtos.MovementResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class MovementService {

    private final MovementRepository repo;
    private final RateService rates;

    public MovementService(MovementRepository repo, RateService rates) {
        this.repo = repo;
        this.rates = rates;
    }

    @Transactional(readOnly = true)
    public List<MovementResponse> list(UUID userId, YearMonth month, MovementKind kind) {
        LocalDate from = month.atDay(1);
        LocalDate to = month.atEndOfMonth();
        List<Movement> items = kind == null
                ? repo.findByUserIdAndDateBetweenOrderByDateDescCreatedAtDesc(userId, from, to)
                : repo.findByUserIdAndKindAndDateBetweenOrderByDateDescCreatedAtDesc(userId, kind, from, to);
        return items.stream().map(MovementResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public MovementResponse get(UUID userId, UUID id) {
        return MovementResponse.from(load(userId, id));
    }

    public MovementResponse create(UUID userId, MovementRequest req) {
        Movement m = new Movement(userId, req.kind());
        apply(userId, m, req);
        return MovementResponse.from(repo.save(m));
    }

    public MovementResponse update(UUID userId, UUID id, MovementRequest req) {
        Movement m = load(userId, id);
        if (m.isTransfer()) {
            throw new BusinessRuleException("Un cambio de divisas no se edita: elimínalo y regístralo de nuevo");
        }
        if (m.getKind() != req.kind()) {
            throw new BusinessRuleException("No se puede convertir una entrada en salida (ni al revés)");
        }
        apply(userId, m, req);
        return MovementResponse.from(m);
    }

    /** Si es parte de un cambio, borra también su contraparte. */
    public void delete(UUID userId, UUID id) {
        Movement m = load(userId, id);
        if (m.isTransfer()) {
            repo.deleteAll(repo.findByUserIdAndTransferGroupId(userId, m.getTransferGroupId()));
        } else {
            repo.delete(m);
        }
    }

    /** Crea la salida y la entrada enlazadas de un cambio o venta de divisas. */
    public ExchangeResponse createExchange(UUID userId, ExchangeRequest req) {
        if (!req.reason().isTransfer()) {
            throw new BusinessRuleException("reason debe ser CURRENCY_SALE o EXCHANGE");
        }
        if (req.fromAccount() == req.toAccount()) {
            throw new BusinessRuleException("La cuenta de origen y destino deben ser distintas");
        }
        RateService.Rates r = resolveRates(userId, req.date(), req.rateUsd(), req.rateEur());
        UUID group = UUID.randomUUID();
        String description = blankToNull(req.description()) != null
                ? req.description().trim()
                : "%s: %s → %s".formatted(req.reason() == ExpenseReason.CURRENCY_SALE ? "Venta de divisas" : "Cambio",
                req.fromAccount(), req.toAccount());

        Movement out = new Movement(userId, MovementKind.EXPENSE);
        out.setDate(req.date());
        out.setAccount(req.fromAccount());
        out.setAmount(req.fromAmount());
        out.setDescription(description);
        out.setExpenseReason(req.reason());
        out.setRateUsd(r.usd());
        out.setRateEur(r.eur());
        out.setTransferGroupId(group);
        if (req.fromAccount() == Account.USDT) {
            out.setUsdtRate(req.usdtCostRate() != null ? req.usdtCostRate() : usdtAverage(userId));
        }

        Movement in = new Movement(userId, MovementKind.INCOME);
        in.setDate(req.date());
        in.setAccount(req.toAccount());
        in.setAmount(req.toAmount());
        in.setDescription(description);
        in.setIncomeType(IncomeType.EXCHANGE);
        in.setRateUsd(r.usd());
        in.setRateEur(r.eur());
        in.setTransferGroupId(group);
        if (req.toAccount() == Account.USDT) {
            in.setUsdtRate(receivedUsdtRate(req, r.usd()));
        }

        repo.save(out);
        repo.save(in);
        return new ExchangeResponse(group, MovementResponse.from(out), MovementResponse.from(in), impliedRate(req));
    }

    /**
     * Tasa de compra de los USDT recibidos:
     * pagando en Bs → Bs pagados / USDT recibidos; pagando en $ → equivalente en Bs (BCV) / USDT recibidos.
     */
    private static BigDecimal receivedUsdtRate(ExchangeRequest req, BigDecimal rateUsd) {
        if (req.fromAccount() == Account.USDT) return null;
        BigDecimal paidInBs = req.fromAccount().currency() == Currency.VES
                ? req.fromAmount()
                : req.fromAmount().multiply(rateUsd);
        return paidInBs.divide(req.toAmount(), FinanceMath.RATE_SCALE, RoundingMode.HALF_UP);
    }

    private static BigDecimal impliedRate(ExchangeRequest req) {
        Currency from = req.fromAccount().currency();
        Currency to = req.toAccount().currency();
        if (from == to) return null;
        return from == Currency.USD
                ? req.toAmount().divide(req.fromAmount(), FinanceMath.RATE_SCALE, RoundingMode.HALF_UP)
                : req.fromAmount().divide(req.toAmount(), FinanceMath.RATE_SCALE, RoundingMode.HALF_UP);
    }

    private void apply(UUID userId, Movement m, MovementRequest req) {
        if (req.kind() == MovementKind.INCOME) {
            if (req.incomeType() == null) throw new BusinessRuleException("incomeType es obligatorio en una entrada");
            if (req.incomeType() == IncomeType.EXCHANGE) {
                throw new BusinessRuleException("Para cambios de divisas usa POST /api/finance/exchanges");
            }
            m.setIncomeType(req.incomeType());
            m.setExpenseReason(null);
            m.setExpenseClass(null);
            m.setCategory(null);
        } else {
            if (req.expenseReason() == null) throw new BusinessRuleException("expenseReason es obligatorio en una salida");
            if (req.expenseReason().isTransfer()) {
                throw new BusinessRuleException("Para cambios o ventas de divisas usa POST /api/finance/exchanges");
            }
            if (req.expenseClass() == null) throw new BusinessRuleException("expenseClass (EXPENSE o COST) es obligatorio");
            m.setExpenseReason(req.expenseReason());
            m.setExpenseClass(req.expenseClass());
            m.setCategory(blankToNull(req.category()));
            m.setIncomeType(null);
        }

        if (req.usdtRate() != null && req.account() != Account.USDT) {
            throw new BusinessRuleException("usdtRate solo aplica a la cuenta USDT");
        }
        RateService.Rates r = resolveRates(userId, req.date(), req.rateUsd(), req.rateEur());
        m.setDate(req.date());
        m.setAccount(req.account());
        m.setAmount(req.amount());
        m.setDescription(blankToNull(req.description()));
        m.setRateUsd(r.usd());
        m.setRateEur(r.eur());
        // Al gastar USDT sin indicar tasa, se usa tu costo promedio de compra.
        BigDecimal usdtRate = req.usdtRate();
        if (usdtRate == null && req.account() == Account.USDT && req.kind() == MovementKind.EXPENSE) {
            usdtRate = usdtAverage(userId);
        }
        m.setUsdtRate(req.account() == Account.USDT ? usdtRate : null);
    }

    private RateService.Rates resolveRates(UUID userId, LocalDate date, BigDecimal usd, BigDecimal eur) {
        if (usd != null && eur != null) return new RateService.Rates(date, usd, eur, RateSource.MANUAL);
        if (usd != null || eur != null) throw new BusinessRuleException("Envía rateUsd y rateEur juntos, o ninguno");
        return rates.requireRatesFor(userId, date);
    }

    private BigDecimal usdtAverage(UUID userId) {
        return FinanceMath.usdtAverageRate(repo.findByUserIdAndAccountOrderByDateAscCreatedAtAsc(userId, Account.USDT))
                .orElse(null);
    }

    private Movement load(UUID userId, UUID id) {
        return repo.findByIdAndUserId(id, userId).orElseThrow(() -> new NotFoundException("Movimiento"));
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
