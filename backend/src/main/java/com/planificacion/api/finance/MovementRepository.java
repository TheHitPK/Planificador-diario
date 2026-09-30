package com.planificacion.api.finance;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MovementRepository extends JpaRepository<Movement, UUID> {

    Optional<Movement> findByIdAndUserId(UUID id, UUID userId);

    List<Movement> findByUserIdAndDateBetweenOrderByDateDescCreatedAtDesc(UUID userId, LocalDate from, LocalDate to);

    List<Movement> findByUserIdAndKindAndDateBetweenOrderByDateDescCreatedAtDesc(UUID userId, MovementKind kind,
                                                                                 LocalDate from, LocalDate to);

    List<Movement> findByUserIdAndTransferGroupId(UUID userId, UUID transferGroupId);

    List<Movement> findByUserId(UUID userId);

    /** Solo USDT, en orden cronológico, para calcular el costo promedio. */
    List<Movement> findByUserIdAndAccountOrderByDateAscCreatedAtAsc(UUID userId, Account account);
}
