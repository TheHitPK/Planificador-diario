package com.planificacion.api.auth;

import com.planificacion.api.auth.AuthDtos.AuthResponse;
import com.planificacion.api.auth.AuthDtos.LoginRequest;
import com.planificacion.api.auth.AuthDtos.RegisterRequest;
import com.planificacion.api.common.error.ConflictException;
import com.planificacion.api.common.error.InvalidCredentialsException;
import com.planificacion.api.user.User;
import com.planificacion.api.user.UserController.UserResponse;
import com.planificacion.api.user.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import java.util.Optional;

@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);
    private static final String BAD_CREDENTIALS = "Email o contraseña incorrectos";

    private final UserRepository users;
    private final RefreshTokenRepository refreshTokens;
    private final PasswordEncoder passwordEncoder;
    private final TokenService tokens;
    private final Clock clock;
    /** Hash ficticio para que un email inexistente tarde lo mismo que uno real (evita enumerar usuarios). */
    private final String dummyHash;

    public AuthService(UserRepository users, RefreshTokenRepository refreshTokens, PasswordEncoder passwordEncoder,
                       TokenService tokens, Clock clock) {
        this.users = users;
        this.refreshTokens = refreshTokens;
        this.passwordEncoder = passwordEncoder;
        this.tokens = tokens;
        this.clock = clock;
        this.dummyHash = passwordEncoder.encode("dummy-password-for-timing");
    }

    @Transactional
    public AuthResponse register(RegisterRequest req) {
        String email = normalize(req.email());
        if (users.existsByEmail(email)) {
            throw new ConflictException("Ya existe una cuenta con ese email");
        }
        User user = users.save(new User(email, passwordEncoder.encode(req.password()), req.fullName().trim()));
        log.info("Usuario registrado {}", user.getId());
        return issueTokens(user);
    }

    @Transactional
    public AuthResponse login(LoginRequest req) {
        Optional<User> found = users.findByEmail(normalize(req.email()));
        String hash = found.map(User::getPasswordHash).orElse(dummyHash);
        boolean matches = passwordEncoder.matches(req.password(), hash);
        if (found.isEmpty() || !matches || !found.get().isEnabled()) {
            throw new InvalidCredentialsException(BAD_CREDENTIALS);
        }
        return issueTokens(found.get());
    }

    /**
     * Rotación de refresh tokens: cada uso invalida el token y entrega uno nuevo.
     * Si llega un token ya revocado, alguien lo reutilizó (posible robo): se revocan todas las sesiones del usuario.
     */
    @Transactional(noRollbackFor = InvalidCredentialsException.class)
    public AuthResponse refresh(String rawToken) {
        Instant now = clock.instant();
        RefreshToken stored = refreshTokens.findByTokenHash(TokenService.hash(rawToken))
                .orElseThrow(() -> new InvalidCredentialsException("Refresh token inválido"));

        if (stored.getRevokedAt() != null) {
            int revoked = refreshTokens.revokeAllForUser(stored.getUserId(), now);
            log.warn("Reutilización de refresh token del usuario {}: {} sesiones revocadas", stored.getUserId(), revoked);
            throw new InvalidCredentialsException("Refresh token inválido");
        }
        if (!stored.isActive(now)) {
            throw new InvalidCredentialsException("Refresh token expirado");
        }

        User user = users.findById(stored.getUserId())
                .filter(User::isEnabled)
                .orElseThrow(() -> new InvalidCredentialsException("Refresh token inválido"));
        stored.setRevokedAt(now);
        return issueTokens(user);
    }

    /** Idempotente: cerrar sesión con un token desconocido o ya revocado no es un error. */
    @Transactional
    public void logout(String rawToken) {
        refreshTokens.findByTokenHash(TokenService.hash(rawToken))
                .filter(t -> t.getRevokedAt() == null)
                .ifPresent(t -> t.setRevokedAt(clock.instant()));
    }

    /** Limpieza diaria de refresh tokens vencidos hace más de una semana. */
    @Scheduled(cron = "0 30 3 * * *")
    @Transactional
    public void purgeExpiredRefreshTokens() {
        int deleted = refreshTokens.deleteExpiredBefore(clock.instant().minus(Duration.ofDays(7)));
        if (deleted > 0) log.info("Eliminados {} refresh tokens vencidos", deleted);
    }

    private AuthResponse issueTokens(User user) {
        TokenService.AccessToken access = tokens.issueAccessToken(user);
        String refresh = tokens.newRefreshToken();
        Instant refreshExpiry = tokens.refreshTokenExpiry();
        refreshTokens.save(new RefreshToken(user.getId(), TokenService.hash(refresh), refreshExpiry));
        return new AuthResponse("Bearer", access.value(), access.expiresAt(), refresh, refreshExpiry,
                UserResponse.from(user));
    }

    private static String normalize(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
