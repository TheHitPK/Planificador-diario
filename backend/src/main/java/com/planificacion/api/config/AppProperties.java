package com.planificacion.api.config;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import java.time.Duration;
import java.util.List;

/** Propiedades {@code app.*} validadas al arrancar: si falta algo, la app no inicia. */
@Validated
@ConfigurationProperties(prefix = "app")
public record AppProperties(@Valid @NotNull Jwt jwt, @Valid @NotNull Cors cors, @Valid @NotNull Rates rates,
                            @Valid @NotNull Mail mail) {

    public record Jwt(
            @NotBlank(message = "Define la variable JWT_SECRET (Base64, mínimo 32 bytes)") String secret,
            @NotBlank String issuer,
            @NotNull Duration accessTokenTtl,
            @NotNull Duration refreshTokenTtl) {
    }

    public record Cors(@NotEmpty List<String> allowedOrigins) {
    }

    public record Rates(@NotBlank String baseUrl) {
    }

    /**
     * Correos de verificación y recuperación.
     *
     * @param frontendUrl     base de los enlaces de los correos (la app web)
     * @param brevoApiKey     clave de la API de Brevo; vacía = los correos solo se escriben en el log (desarrollo)
     * @param resendCooldown  tiempo mínimo entre dos correos del mismo tipo al mismo usuario
     */
    public record Mail(
            @NotBlank String frontendUrl,
            @NotBlank @Email String fromEmail,
            @NotBlank String fromName,
            String brevoApiKey,
            @NotNull Duration verificationTtl,
            @NotNull Duration passwordResetTtl,
            @NotNull Duration resendCooldown) {
    }
}
