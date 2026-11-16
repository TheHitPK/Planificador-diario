package com.planificacion.api.auth;

import com.planificacion.api.user.AccountType;
import com.planificacion.api.user.UserController.UserResponse;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.Instant;

public final class AuthDtos {

    private AuthDtos() {
    }

    public record RegisterRequest(
            @NotBlank @Email @Size(max = 255) String email,
            // BCrypt solo usa los primeros 72 bytes
            @NotBlank @Size(min = 8, max = 72, message = "La contraseña debe tener entre 8 y 72 caracteres") String password,
            @NotBlank @Size(max = 120) String fullName,
            // Opcional: si no llega, la cuenta es personal
            AccountType accountType) {
    }

    public record LoginRequest(@NotBlank @Email String email, @NotBlank String password) {
    }

    public record RefreshRequest(@NotBlank String refreshToken) {
    }

    /**
     * Con verificación de correo: {@code verificationRequired=true} y sin sesión (llega al confirmar el correo).
     * Sin ella: {@code session} trae los tokens y el usuario ya puede usar la app.
     */
    public record RegisterResponse(String email, boolean verificationRequired, AuthResponse session) {
    }

    /** Para reenviar la verificación o pedir el enlace de recuperación. */
    public record EmailRequest(@NotBlank @Email @Size(max = 255) String email) {
    }

    public record VerifyEmailRequest(@NotBlank @Size(max = 100) String token) {
    }

    public record ResetPasswordRequest(
            @NotBlank @Size(max = 100) String token,
            @NotBlank @Size(min = 8, max = 72, message = "La contraseña debe tener entre 8 y 72 caracteres") String newPassword) {
    }

    public record AuthResponse(
            String tokenType,
            String accessToken,
            Instant accessTokenExpiresAt,
            String refreshToken,
            Instant refreshTokenExpiresAt,
            UserResponse user) {
    }
}
