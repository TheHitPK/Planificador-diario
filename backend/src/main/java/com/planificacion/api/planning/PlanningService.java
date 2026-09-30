package com.planificacion.api.planning;

import com.planificacion.api.common.error.BusinessRuleException;
import com.planificacion.api.discipline.Discipline;
import com.planificacion.api.discipline.DisciplineRepository;
import com.planificacion.api.discipline.DisciplineService;
import com.planificacion.api.planning.DisciplineCheckRepository.CheckView;
import com.planificacion.api.planning.PlanningDtos.DayResponse;
import com.planificacion.api.planning.PlanningDtos.RangeResponse;
import com.planificacion.api.planning.PlanningDtos.Summary;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional
public class PlanningService {

    /** Límite para no calcular rangos absurdos (un año bisiesto + margen). */
    private static final long MAX_RANGE_DAYS = 400;

    private final DisciplineCheckRepository checks;
    private final DisciplineRepository disciplines;
    private final DisciplineService disciplineService;
    private final Clock clock;

    public PlanningService(DisciplineCheckRepository checks, DisciplineRepository disciplines,
                           DisciplineService disciplineService, Clock clock) {
        this.checks = checks;
        this.disciplines = disciplines;
        this.disciplineService = disciplineService;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public RangeResponse range(UUID userId, LocalDate from, LocalDate to) {
        if (to.isBefore(from)) throw new BusinessRuleException("'to' no puede ser anterior a 'from'");
        if (ChronoUnit.DAYS.between(from, to) > MAX_RANGE_DAYS) {
            throw new BusinessRuleException("El rango máximo es de " + MAX_RANGE_DAYS + " días");
        }

        Set<UUID> active = disciplines.findByUserIdAndArchivedFalseOrderByPositionAscCreatedAtAsc(userId).stream()
                .map(Discipline::getId).collect(Collectors.toSet());
        int total = active.size();

        Map<LocalDate, List<UUID>> byDay = new HashMap<>();
        for (CheckView c : checks.findActiveInRange(userId, from, to)) {
            byDay.computeIfAbsent(c.getDate(), d -> new ArrayList<>()).add(c.getDisciplineId());
        }

        LocalDate today = LocalDate.now(clock);
        LocalDate start = checks.findFirstCheckDate(userId).orElse(today);

        List<DayResponse> days = new ArrayList<>();
        int sumDone = 0;
        int sumTotal = 0;
        for (LocalDate d = from; !d.isAfter(to); d = d.plusDays(1)) {
            List<UUID> done = byDay.getOrDefault(d, List.of());
            boolean countable = !d.isAfter(today) && !d.isBefore(start);
            days.add(new DayResponse(d, done, done.size(), total,
                    d.isAfter(today) ? CompletionLevel.NONE : CompletionLevel.of(done.size(), total)));
            if (countable) {
                sumDone += done.size();
                sumTotal += total;
            }
        }
        Double ratio = sumTotal > 0 ? (double) sumDone / sumTotal : null;
        return new RangeResponse(from, to, total, days,
                new Summary(sumDone, sumTotal, ratio, CompletionLevel.of(sumDone, sumTotal)));
    }

    /** Marca una disciplina como cumplida ese día. Idempotente. */
    public void check(UUID userId, UUID disciplineId, LocalDate date) {
        rejectFuture(date);
        Discipline d = disciplineService.load(userId, disciplineId);
        if (checks.findByDisciplineIdAndDate(disciplineId, date).isEmpty()) {
            checks.save(new DisciplineCheck(d, date));
        }
    }

    /** Desmarca. Idempotente. */
    public void uncheck(UUID userId, UUID disciplineId, LocalDate date) {
        disciplineService.load(userId, disciplineId);
        checks.deleteByDisciplineAndDate(disciplineId, date);
    }

    private void rejectFuture(LocalDate date) {
        if (date.isAfter(LocalDate.now(clock))) {
            throw new BusinessRuleException("No puedes marcar días que aún no llegan");
        }
    }
}
