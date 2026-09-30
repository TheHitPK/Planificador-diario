package com.planificacion.api.nutrition;

import com.planificacion.api.common.web.CurrentUserId;
import com.planificacion.api.nutrition.NutritionDtos.BodyRequest;
import com.planificacion.api.nutrition.NutritionDtos.BodyResponse;
import com.planificacion.api.nutrition.NutritionDtos.BodySummary;
import com.planificacion.api.nutrition.NutritionDtos.CopyDayRequest;
import com.planificacion.api.nutrition.NutritionDtos.DayTotal;
import com.planificacion.api.nutrition.NutritionDtos.DiaryResponse;
import com.planificacion.api.nutrition.NutritionDtos.FoodRequest;
import com.planificacion.api.nutrition.NutritionDtos.FoodResponse;
import com.planificacion.api.nutrition.NutritionDtos.LogEntryRequest;
import com.planificacion.api.nutrition.NutritionDtos.LogEntryResponse;
import com.planificacion.api.nutrition.NutritionDtos.LogEntryUpdateRequest;
import com.planificacion.api.nutrition.NutritionDtos.PlanResponse;
import com.planificacion.api.nutrition.NutritionDtos.ProfileRequest;
import com.planificacion.api.nutrition.NutritionDtos.ProfileResponse;
import com.planificacion.api.nutrition.NutritionDtos.TargetsRequest;
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
import java.util.List;
import java.util.UUID;

import static org.springframework.format.annotation.DateTimeFormat.ISO.DATE;

@RestController
@RequestMapping("/api/nutrition")
public class NutritionController {

    private final FoodService foods;
    private final DiaryService diary;
    private final BodyService body;
    private final ProfileService profile;
    private final Clock clock;

    public NutritionController(FoodService foods, DiaryService diary, BodyService body, ProfileService profile,
                               Clock clock) {
        this.foods = foods;
        this.diary = diary;
        this.body = body;
        this.profile = profile;
        this.clock = clock;
    }

    // ---- Alimentos ----

    @GetMapping("/foods")
    public List<FoodResponse> foods(@CurrentUserId UUID userId, @RequestParam(required = false) String q) {
        return foods.search(userId, q);
    }

    @PostMapping("/foods")
    @ResponseStatus(HttpStatus.CREATED)
    public FoodResponse createFood(@CurrentUserId UUID userId, @Valid @RequestBody FoodRequest req) {
        return foods.create(userId, req);
    }

    @PutMapping("/foods/{id}")
    public FoodResponse updateFood(@CurrentUserId UUID userId, @PathVariable UUID id, @Valid @RequestBody FoodRequest req) {
        return foods.update(userId, id, req);
    }

    @DeleteMapping("/foods/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteFood(@CurrentUserId UUID userId, @PathVariable UUID id) {
        foods.delete(userId, id);
    }

    // ---- Diario de comidas ----

    /** {@code GET /api/nutrition/diary?date=2026-09-30} — por defecto hoy. */
    @GetMapping("/diary")
    public DiaryResponse day(@CurrentUserId UUID userId,
                             @RequestParam(required = false) @DateTimeFormat(iso = DATE) LocalDate date) {
        return diary.day(userId, date != null ? date : LocalDate.now(clock));
    }

    @GetMapping("/diary/totals")
    public List<DayTotal> totals(@CurrentUserId UUID userId,
                                 @RequestParam @DateTimeFormat(iso = DATE) LocalDate from,
                                 @RequestParam @DateTimeFormat(iso = DATE) LocalDate to) {
        return diary.totals(userId, from, to);
    }

    @GetMapping("/diary/entries")
    public List<LogEntryResponse> entries(@CurrentUserId UUID userId,
                                          @RequestParam @DateTimeFormat(iso = DATE) LocalDate from,
                                          @RequestParam @DateTimeFormat(iso = DATE) LocalDate to) {
        return diary.entries(userId, from, to);
    }

    @PostMapping("/diary/entries")
    @ResponseStatus(HttpStatus.CREATED)
    public LogEntryResponse addEntry(@CurrentUserId UUID userId, @Valid @RequestBody LogEntryRequest req) {
        return diary.add(userId, req);
    }

    @PutMapping("/diary/entries/{id}")
    public LogEntryResponse updateEntry(@CurrentUserId UUID userId, @PathVariable UUID id,
                                        @Valid @RequestBody LogEntryUpdateRequest req) {
        return diary.update(userId, id, req);
    }

    @DeleteMapping("/diary/entries/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteEntry(@CurrentUserId UUID userId, @PathVariable UUID id) {
        diary.delete(userId, id);
    }

    @PostMapping("/diary/copy")
    @ResponseStatus(HttpStatus.CREATED)
    public List<LogEntryResponse> copyDay(@CurrentUserId UUID userId, @Valid @RequestBody CopyDayRequest req) {
        return diary.copyDay(userId, req.from(), req.to());
    }

    // ---- Cuerpo ----

    @GetMapping("/body")
    public BodySummary body(@CurrentUserId UUID userId) {
        return body.summary(userId);
    }

    /** Crea o reemplaza el registro de ese día. */
    @PutMapping("/body")
    public BodyResponse upsertBody(@CurrentUserId UUID userId, @Valid @RequestBody BodyRequest req) {
        return body.upsert(userId, req);
    }

    @DeleteMapping("/body/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteBody(@CurrentUserId UUID userId, @PathVariable UUID id) {
        body.delete(userId, id);
    }

    // ---- Perfil, objetivos y plan ----

    @GetMapping("/profile")
    public ProfileResponse profile(@CurrentUserId UUID userId) {
        return profile.get(userId);
    }

    @PutMapping("/profile")
    public ProfileResponse updateProfile(@CurrentUserId UUID userId, @Valid @RequestBody ProfileRequest req) {
        return profile.updateProfile(userId, req);
    }

    @PutMapping("/profile/targets")
    public ProfileResponse updateTargets(@CurrentUserId UUID userId, @Valid @RequestBody TargetsRequest req) {
        return profile.updateTargets(userId, req);
    }

    /** Plan recomendado (no guarda nada). */
    @GetMapping("/plan")
    public PlanResponse plan(@CurrentUserId UUID userId) {
        return profile.plan(userId);
    }

    /** Calcula el plan y lo guarda como tus objetivos. */
    @PostMapping("/plan/apply")
    public ProfileResponse applyPlan(@CurrentUserId UUID userId) {
        return profile.applyPlan(userId);
    }
}
