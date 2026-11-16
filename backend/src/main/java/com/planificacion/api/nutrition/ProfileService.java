package com.planificacion.api.nutrition;

import com.planificacion.api.common.error.BusinessRuleException;
import com.planificacion.api.nutrition.NutritionDtos.PlanResponse;
import com.planificacion.api.nutrition.NutritionDtos.ProfileRequest;
import com.planificacion.api.nutrition.NutritionDtos.ProfileResponse;
import com.planificacion.api.nutrition.NutritionDtos.TargetsRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.Period;
import java.util.UUID;

@Service
@Transactional
public class ProfileService {

    private final NutritionProfileRepository repo;
    private final BodyMeasurementRepository body;
    private final Clock clock;

    public ProfileService(NutritionProfileRepository repo, BodyMeasurementRepository body, Clock clock) {
        this.repo = repo;
        this.body = body;
        this.clock = clock;
    }

    /** Si el usuario aún no tiene perfil, devuelve uno por defecto (sin guardarlo). */
    @Transactional(readOnly = true)
    public ProfileResponse get(UUID userId) {
        return toResponse(repo.findById(userId).orElseGet(() -> new NutritionProfile(userId)));
    }

    @Transactional(readOnly = true)
    public Macros targets(UUID userId) {
        return repo.findById(userId).orElseGet(() -> new NutritionProfile(userId)).targets();
    }

    public ProfileResponse updateProfile(UUID userId, ProfileRequest req) {
        NutritionProfile p = getOrCreate(userId);
        p.setSex(req.sex());
        p.setBirthDate(req.birthDate());
        p.setHeightCm(req.heightCm());
        p.setActivityLevel(req.activityLevel());
        p.setGoal(req.goal());
        return toResponse(p);
    }

    public ProfileResponse updateTargets(UUID userId, TargetsRequest req) {
        NutritionProfile p = getOrCreate(userId);
        p.setTargetKcal(req.kcal());
        p.setTargetProtein(req.protein());
        p.setTargetCarbs(req.carbs());
        p.setTargetFat(req.fat());
        p.setTargetFiber(req.fiber());
        return toResponse(p);
    }

    /** Calcula un plan con el perfil y el último peso / % de grasa registrados. */
    @Transactional(readOnly = true)
    public PlanResponse plan(UUID userId) {
        NutritionProfile p = repo.findById(userId).filter(NutritionProfile::isComplete).orElseThrow(() ->
                new BusinessRuleException("Completa tu perfil (sexo, fecha de nacimiento, estatura, actividad y objetivo)"));
        BodyMeasurement latest = body.findFirstByUserIdOrderByDateDesc(userId).orElseThrow(() ->
                new BusinessRuleException("Registra tu peso para calcular el plan"));
        BigDecimal fat = body.findFirstByUserIdAndBodyFatPctIsNotNullOrderByDateDesc(userId)
                .map(BodyMeasurement::getBodyFatPct).orElse(null);

        NutritionCalculator.Plan plan = NutritionCalculator.plan(p.getSex(), age(p.getBirthDate()),
                p.getHeightCm().doubleValue(), latest.getWeightKg().doubleValue(),
                fat != null ? fat.doubleValue() : null, p.getActivityLevel(), p.getGoal());
        return new PlanResponse(latest.getWeightKg(), fat, plan);
    }

    /** Calcula el plan y lo guarda como objetivos diarios. */
    public ProfileResponse applyPlan(UUID userId) {
        NutritionCalculator.Plan plan = plan(userId).plan();
        return updateTargets(userId, new TargetsRequest(plan.kcal(), plan.protein(), plan.carbs(), plan.fat(),
                plan.fiber()));
    }

    private NutritionProfile getOrCreate(UUID userId) {
        return repo.findById(userId).orElseGet(() -> repo.save(new NutritionProfile(userId)));
    }

    private int age(LocalDate birthDate) {
        return Period.between(birthDate, LocalDate.now(clock)).getYears();
    }

    private ProfileResponse toResponse(NutritionProfile p) {
        return new ProfileResponse(p.getSex(), p.getBirthDate(), p.getBirthDate() != null ? age(p.getBirthDate()) : null,
                p.getHeightCm(), p.getActivityLevel(), p.getGoal(), p.targets(), p.isComplete());
    }
}
