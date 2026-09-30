package com.planificacion.api.discipline;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DisciplineRepository extends JpaRepository<Discipline, UUID> {

    List<Discipline> findByUserIdOrderByPositionAscCreatedAtAsc(UUID userId);

    List<Discipline> findByUserIdAndArchivedFalseOrderByPositionAscCreatedAtAsc(UUID userId);

    Optional<Discipline> findByIdAndUserId(UUID id, UUID userId);

    @Query("select coalesce(max(d.position), -1) + 1 from Discipline d where d.userId = :userId")
    int nextPosition(@Param("userId") UUID userId);
}
