package com.planificacion.api.nutrition;

import com.planificacion.api.common.error.NotFoundException;
import com.planificacion.api.nutrition.NutritionDtos.BodyRequest;
import com.planificacion.api.nutrition.NutritionDtos.BodyResponse;
import com.planificacion.api.nutrition.NutritionDtos.BodySummary;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Service
@Transactional
public class BodyService {

    private final BodyMeasurementRepository repo;
    private final NutritionProfileRepository profiles;

    public BodyService(BodyMeasurementRepository repo, NutritionProfileRepository profiles) {
        this.repo = repo;
        this.profiles = profiles;
    }

    @Transactional(readOnly = true)
    public BodySummary summary(UUID userId) {
        List<BodyMeasurement> all = repo.findByUserIdOrderByDateAsc(userId);
        List<BodyResponse> history = all.stream().map(BodyResponse::from).toList();
        if (all.isEmpty()) return new BodySummary(null, null, null, null, history);

        BodyMeasurement first = all.getFirst();
        BodyMeasurement last = all.getLast();
        BigDecimal weightChange = all.size() > 1 ? last.getWeightKg().subtract(first.getWeightKg()) : null;

        List<BodyMeasurement> withFat = all.stream().filter(b -> b.getBodyFatPct() != null).toList();
        BigDecimal fatChange = withFat.size() > 1
                ? withFat.getLast().getBodyFatPct().subtract(withFat.getFirst().getBodyFatPct())
                : null;

        BigDecimal bmi = profiles.findById(userId)
                .map(NutritionProfile::getHeightCm)
                .filter(Objects::nonNull)
                .map(h -> NutritionCalculator.bmi(last.getWeightKg(), h))
                .orElse(null);

        return new BodySummary(BodyResponse.from(last), weightChange, fatChange, bmi, history);
    }

    /** Un registro por día: si ya existe para esa fecha, se reemplaza. */
    public BodyResponse upsert(UUID userId, BodyRequest req) {
        BodyMeasurement b = repo.findByUserIdAndDate(userId, req.date())
                .orElseGet(() -> new BodyMeasurement(userId, req.date()));
        b.setWeightKg(req.weightKg());
        b.setBodyFatPct(req.bodyFatPct());
        b.setWaistCm(req.waistCm());
        b.setNote(req.note() == null || req.note().isBlank() ? null : req.note().trim());
        return BodyResponse.from(repo.save(b));
    }

    public void delete(UUID userId, UUID id) {
        repo.delete(repo.findByIdAndUserId(id, userId).orElseThrow(() -> new NotFoundException("Registro corporal")));
    }
}
