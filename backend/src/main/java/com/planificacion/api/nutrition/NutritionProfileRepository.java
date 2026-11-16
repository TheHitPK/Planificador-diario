package com.planificacion.api.nutrition;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface NutritionProfileRepository extends JpaRepository<NutritionProfile, UUID> {
}
