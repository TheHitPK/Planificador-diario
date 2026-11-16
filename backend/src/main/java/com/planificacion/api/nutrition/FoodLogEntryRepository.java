package com.planificacion.api.nutrition;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FoodLogEntryRepository extends JpaRepository<FoodLogEntry, UUID> {

    List<FoodLogEntry> findByUserIdAndDateOrderByCreatedAtAsc(UUID userId, LocalDate date);

    List<FoodLogEntry> findByUserIdAndDateBetween(UUID userId, LocalDate from, LocalDate to);

    Optional<FoodLogEntry> findByIdAndUserId(UUID id, UUID userId);

    boolean existsByUserId(UUID userId);
}
