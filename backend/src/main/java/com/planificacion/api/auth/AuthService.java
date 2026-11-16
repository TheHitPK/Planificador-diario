package com.planificacion.api.auth;

import com.planificacion.api.auth.AuthDtos.AuthResponse;
import com.planificacion.api.auth.AuthDtos.LoginRequest;
import com.planificacion.api.auth.AuthDtos.RegisterRequest;
import com.planificacion.api.auth.AuthDtos.RegisterResponse;
import com.planificacion.api.common.error.BusinessRuleException;
import com.planificacion.api.common.error.ConflictException;
import com.planificacion.api.common.error.EmailNotVerifiedException;
import com.planificacion.api.common.error.MailDisabledException;
import com.planificacion.api.config.AppProperties;
import com.planificacion.api.common.error.InvalidCredentialsException;
import com.planificacion.api.user.AccountType;
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
    private final AccountEmailService accountEmails;
    private final Clock clock;
    /** {@code app.mail.enabled}: si es false no se verifica el correo ni hay recuperación por email. */
    private final boolean mailEnabled;
    /** Hash ficticio para que un email inexistente tarde lo mismo que uno real (evita enumerar usuarios). */
    private final String dummyHash;

    public AuthService(UserRepository users, RefreshTokenRepository refreshTokens, PasswordEncoder passwordEncoder,
                       TokenService tokens, AccountEmailService accountEmails, AppProperties props, Clock clock) {
        this.mailEnabled = props.mail().enabled();
        this.users = users;
        this.refreshTokens = refreshTokens;
        this.passwordEncoder = passwordEncoder;
        this.tokens = tokens;
        this.accountEmails = accountEmails;
        this.clock = clock;
        this.dummyHash = passwordEncoder.encode("dummy-password-for-timing");
    }

    /**
     * Con el correo activo: crea la cuenta sin verificar, envía la confirmación y no inicia sesión.
     * Con el correo apagado: la cuenta queda verificada y se inicia sesión directamente.
     */
    @Transactional
    public RegisterResponse register(RegisterRequest req) {
        String email = normalize(req.email());
        if (users.existsByEmail(email)) {
            throw new ConflictException("Ya existe una cuenta con ese email");
        }
        AccountType accountType = req.accountType() != null ? req.accountType() : AccountType.PERSONAL;
        User user = new User(email, passwordEncoder.encode(req.password()), req.fullName().trim(), accountType);
        if (!mailEnabled) user.setEmailVerifiedAt(clock.instant());
        user = users.save(user);
        log.info("Usuario registrado {}", user.getId());

        if (!mailEnabled) return new RegisterResponse(user.getEmail(), false, issueTokens(user));
        accountEmails.send(user, EmailTokenPurpose.VERIFY_EMAIL);
        return new RegisterResponse(user.getEmail(), true, null);
    }

    @Transactional
    public AuthResponse login(LoginRequest req) {
        Optional<User> found = users.findByEmail(normalize(req.email()));
        String hash = found.map(User::getPasswordHash).orElse(dummyHash);
        boolean matches = passwordEncoder.matches(req.password(), hash);
        if (found.isEmpty() || !matches || !found.get().isEnabled()) {
            throw new InvalidCredentialsException(BAD_CREDENTIALS);
        }
        // Solo se revela después de comprobar la contraseña, así no sirve para averiguar qué emails existen.
        if (mailEnabled && !found.get().isEmailVerified()) {
            throw new EmailNotVerifiedException();
        }
        return issueTokens(found.get());
    }

    /** Confirma el correo con el enlace recibido e inicia sesión directamente. */
    @Transactional
    public AuthResponse verifyEmail(String rawToken) {
        EmailToken token = accountEmails.consume(rawToken, EmailTokenPurpose.VERIFY_EMAIL);
        User user = users.findById(token.getUserId())
                .filter(User::isEnabled)
                .orElseThrow(() -> new BusinessRuleException("La cuenta no está disponible"));
        if (!user.isEmailVerified()) {
            user.setEmailVerifiedAt(clock.instant());
            log.info("Correo verificado del usuario {}", user.getId());
        }
        return issueTokens(user);
    }

    /** Respuesta idéntica exista o no la cuenta (no revela qué emails están registrados). */
    @Transactional
    public void resendVerification(String email) {
        requireMail();
        users.findByEmail(normalize(email))
                .filter(u -> u.isEnabled() && !u.isEmailVerified())
                .ifPresent(u -> accountEmails.send(u, EmailTokenPurpose.VERIFY_EMAIL));
    }

    /** Respuesta idéntica exista o no la cuenta (no revela qué emails están registrados). */
    @Transactional
    public void forgotPassword(String email) {
        requireMail();
        users.findByEmail(normalize(email))
                .filter(User::isEnabled)
                .ifPresent(u -> accountEmails.send(u, EmailTokenPurpose.RESET_PASSWORD));
    }

    /**
     * Cambia la contraseña con el enlace recibido y cierra todas las sesiones abiertas
     * (si alguien había entrado con la contraseña vieja, queda fuera).
     */
    @Transactional
    public void resetPassword(String rawToken, String newPassword) {
        EmailToken token = accountEmails.consume(rawToken, EmailTokenPurpose.RESET_PASSWORD);
        User user = users.findById(token.getUserId())
                .filter(User::isEnabled)
                .orElseThrow(() -> new BusinessRuleException("La cuenta no está disponible"));
        Instant now = clock.instant();
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        // Recibió el enlace en su buzón: el correo queda demostrado.
        if (!user.isEmailVerified()) user.setEmailVerifiedAt(now);
        int revoked = refreshTokens.revokeAllForUser(user.getId(), now);
        log.info("Contraseña restablecida del usuario {} ({} sesiones cerradas)", user.getId(), revoked);
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
        Instant cutoff = clock.instant().minus(Duration.ofDays(7));
        int deleted = refreshTokens.deleteExpiredBefore(cutoff);
        if (deleted > 0) log.info("Eliminados {} refresh tokens vencidos", deleted);
        int links = accountEmails.purgeExpiredBefore(cutoff);
        if (links > 0) log.info("Eliminados {} enlaces de correo vencidos", links);
    }

    private AuthResponse issueTokens(User user) {
        TokenService.AccessToken access = tokens.issueAccessToken(user);
        String refresh = tokens.newRefreshToken();
        Instant refreshExpiry = tokens.refreshTokenExpiry();
        refreshTokens.save(new RefreshToken(user.getId(), TokenService.hash(refresh), refreshExpiry));
        return new AuthResponse("Bearer", access.value(), access.expiresAt(), refresh, refreshExpiry,
                UserResponse.from(user));
    }

    private void requireMail() {
        if (!mailEnabled) throw new MailDisabledException();
    }

    private static String normalize(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
