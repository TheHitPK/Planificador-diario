package com.planificacion.api.planning;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DisciplineCheckRepository extends JpaRepository<DisciplineCheck, UUID> {

    /** Días cumplidos de disciplinas activas (no archivadas) del usuario en un rango. */
    @Query("""
            select c.discipline.id as disciplineId, c.date as date
            from DisciplineCheck c
            where c.discipline.userId = :userId
              and c.discipline.archived = false
              and c.date between :from and :to
            """)
    List<CheckView> findActiveInRange(@Param("userId") UUID userId, @Param("from") LocalDate from,
                                      @Param("to") LocalDate to);

    Optional<DisciplineCheck> findByDisciplineIdAndDate(UUID disciplineId, LocalDate date);

    @Modifying
    @Query("delete from DisciplineCheck c where c.discipline.id = :disciplineId and c.date = :date")
    int deleteByDisciplineAndDate(@Param("disciplineId") UUID disciplineId, @Param("date") LocalDate date);

    @Query("select min(c.date) from DisciplineCheck c where c.discipline.userId = :userId")
    Optional<LocalDate> findFirstCheckDate(@Param("userId") UUID userId);

    /** Proyección ligera: evita cargar entidades completas en rangos grandes (año). */
    interface CheckView {
        UUID getDisciplineId();

        LocalDate getDate();
    }
}
