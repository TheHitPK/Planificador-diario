package com.planificacion.api.nutrition;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.time.LocalDate;
import java.util.UUID;

public interface BodyMeasurementRepository extends JpaRepository<BodyMeasurement, UUID> {

    List<BodyMeasurement> findByUserIdOrderByDateAsc(UUID userId);

    Optional<BodyMeasurement> findByUserIdAndDate(UUID userId, LocalDate date);

    Optional<BodyMeasurement> findByIdAndUserId(UUID id, UUID userId);

    Optional<BodyMeasurement> findFirstByUserIdOrderByDateDesc(UUID userId);

    Optional<BodyMeasurement> findFirstByUserIdAndBodyFatPctIsNotNullOrderByDateDesc(UUID userId);
}
