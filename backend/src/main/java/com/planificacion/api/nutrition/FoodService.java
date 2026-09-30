package com.planificacion.api.nutrition;

import com.planificacion.api.common.error.BusinessRuleException;
import com.planificacion.api.common.error.NotFoundException;
import com.planificacion.api.nutrition.NutritionDtos.FoodRequest;
import com.planificacion.api.nutrition.NutritionDtos.FoodResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class FoodService {

    private final FoodRepository repo;

    public FoodService(FoodRepository repo) {
        this.repo = repo;
    }

    @Transactional(readOnly = true)
    public List<FoodResponse> search(UUID userId, String query) {
        return repo.search(userId, query).stream().map(FoodResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public Food loadVisible(UUID userId, UUID id) {
        return repo.findVisible(id, userId).orElseThrow(() -> new NotFoundException("Alimento"));
    }

    public FoodResponse create(UUID userId, FoodRequest req) {
        Food f = new Food(userId);
        apply(f, req);
        return FoodResponse.from(repo.save(f));
    }

    public FoodResponse update(UUID userId, UUID id, FoodRequest req) {
        Food f = loadOwn(userId, id);
        apply(f, req);
        return FoodResponse.from(f);
    }

    /** Lo ya registrado en el diario no cambia (guarda su propia copia de los macros). */
    public void delete(UUID userId, UUID id) {
        repo.delete(loadOwn(userId, id));
    }

    private Food loadOwn(UUID userId, UUID id) {
        Food f = loadVisible(userId, id);
        if (f.isGlobal()) {
            throw new BusinessRuleException("Los alimentos del catálogo no se pueden modificar; crea uno propio");
        }
        return f;
    }

    private static void apply(Food f, FoodRequest req) {
        f.setName(req.name().trim());
        f.setUnit(req.unit());
        f.setPortion(req.portion());
        f.setProtein(req.protein());
        f.setCarbs(req.carbs());
        f.setFat(req.fat());
        f.setFiber(req.fiber() != null ? req.fiber() : BigDecimal.ZERO);
        f.setKcal(req.kcal() != null ? req.kcal() : kcalFromMacros(req.protein(), req.carbs(), req.fat()));
    }

    /** 4 kcal/g proteína y carbohidrato, 9 kcal/g grasa. */
    static BigDecimal kcalFromMacros(BigDecimal protein, BigDecimal carbs, BigDecimal fat) {
        return protein.multiply(BigDecimal.valueOf(4))
                .add(carbs.multiply(BigDecimal.valueOf(4)))
                .add(fat.multiply(BigDecimal.valueOf(9)));
    }
}
