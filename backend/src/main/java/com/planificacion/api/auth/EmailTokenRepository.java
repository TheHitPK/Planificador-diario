package com.planificacion.api.auth;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public interface EmailTokenRepository extends JpaRepository<EmailToken, UUID> {

    Optional<EmailToken> findByTokenHashAndPurpose(String tokenHash, EmailTokenPurpose purpose);

    /** Para no enviar un correo nuevo si ya se envió uno hace muy poco. */
    boolean existsByUserIdAndPurposeAndCreatedAtAfter(UUID userId, EmailTokenPurpose purpose, Instant since);

    /** Invalida los enlaces pendientes: solo el último enviado (o ninguno) sigue sirviendo. */
    @Modifying
    @Query("update EmailToken t set t.usedAt = :now where t.userId = :userId and t.purpose = :purpose and t.usedAt is null")
    int invalidateAll(@Param("userId") UUID userId, @Param("purpose") EmailTokenPurpose purpose, @Param("now") Instant now);

    @Modifying
    @Query("delete from EmailToken t where t.expiresAt < :cutoff")
    int deleteExpiredBefore(@Param("cutoff") Instant cutoff);
}
