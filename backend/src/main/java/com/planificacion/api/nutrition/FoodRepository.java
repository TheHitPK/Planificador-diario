package com.planificacion.api.nutrition;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FoodRepository extends JpaRepository<Food, UUID> {

    /** Catálogo global + alimentos propios. */
    @Query("select f from Food f where f.userId is null or f.userId = :userId order by f.name")
    List<Food> findVisible(@Param("userId") UUID userId);

    /** Igual, filtrando por nombre sin distinguir mayúsculas. */
    @Query("""
            select f from Food f
            where (f.userId is null or f.userId = :userId)
              and lower(f.name) like lower(concat('%', :q, '%'))
            order by f.name
            """)
    List<Food> searchVisible(@Param("userId") UUID userId, @Param("q") String query);

    /** Un alimento visible para el usuario (global o propio). */
    @Query("select f from Food f where f.id = :id and (f.userId is null or f.userId = :userId)")
    Optional<Food> findVisible(@Param("id") UUID id, @Param("userId") UUID userId);

    default List<Food> search(UUID userId, String query) {
        return query == null || query.isBlank() ? findVisible(userId) : searchVisible(userId, query.trim());
    }
}
