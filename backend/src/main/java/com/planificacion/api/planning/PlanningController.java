package com.planificacion.api.planning;

import com.planificacion.api.common.web.CurrentUserId;
import com.planificacion.api.planning.PlanningDtos.RangeResponse;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.UUID;

import static org.springframework.format.annotation.DateTimeFormat.ISO.DATE;

/**
 * Planificación diaria.
 * <ul>
 *   <li>{@code GET /api/planning?from=2026-09-28&to=2026-10-04} → días con disciplinas cumplidas y semáforo.</li>
 *   <li>{@code PUT /api/planning/2026-09-30/disciplines/{id}} → marcar.</li>
 *   <li>{@code DELETE /api/planning/2026-09-30/disciplines/{id}} → desmarcar.</li>
 * </ul>
 */
@RestController
@RequestMapping("/api/planning")
public class PlanningController {

    private final PlanningService service;

    public PlanningController(PlanningService service) {
        this.service = service;
    }

    @GetMapping
    public RangeResponse range(@CurrentUserId UUID userId,
                               @RequestParam @DateTimeFormat(iso = DATE) LocalDate from,
                               @RequestParam @DateTimeFormat(iso = DATE) LocalDate to) {
        return service.range(userId, from, to);
    }

    @PutMapping("/{date}/disciplines/{disciplineId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void check(@CurrentUserId UUID userId, @PathVariable @DateTimeFormat(iso = DATE) LocalDate date,
                      @PathVariable UUID disciplineId) {
        service.check(userId, disciplineId, date);
    }

    @DeleteMapping("/{date}/disciplines/{disciplineId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void uncheck(@CurrentUserId UUID userId, @PathVariable @DateTimeFormat(iso = DATE) LocalDate date,
                        @PathVariable UUID disciplineId) {
        service.uncheck(userId, disciplineId, date);
    }
}
