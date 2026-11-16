package com.planificacion.api.auth;

import com.planificacion.api.common.error.BusinessRuleException;
import com.planificacion.api.config.AppProperties;
import com.planificacion.api.mail.AccountEmailTemplates;
import com.planificacion.api.mail.EmailMessage;
import com.planificacion.api.user.User;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;

/** Crea y consume los enlaces de un solo uso que se envían por correo. */
@Service
public class AccountEmailService {

    private final EmailTokenRepository emailTokens;
    private final TokenService tokens;
    private final ApplicationEventPublisher events;
    private final AppProperties.Mail props;
    private final Clock clock;

    public AccountEmailService(EmailTokenRepository emailTokens, TokenService tokens, ApplicationEventPublisher events,
                               AppProperties props, Clock clock) {
        this.emailTokens = emailTokens;
        this.tokens = tokens;
        this.events = events;
        this.props = props.mail();
        this.clock = clock;
    }

    /**
     * Genera un enlace nuevo (invalida los anteriores del mismo tipo) y encola el correo.
     * Si ya se envió uno hace menos de {@code resend-cooldown}, no hace nada: evita que alguien
     * use el formulario para inundar el buzón de otra persona.
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public void send(User user, EmailTokenPurpose purpose) {
        Instant now = clock.instant();
        if (emailTokens.existsByUserIdAndPurposeAndCreatedAtAfter(user.getId(), purpose, now.minus(props.resendCooldown()))) {
            return;
        }
        emailTokens.invalidateAll(user.getId(), purpose, now);

        Duration ttl = purpose == EmailTokenPurpose.VERIFY_EMAIL ? props.verificationTtl() : props.passwordResetTtl();
        String raw = tokens.newRefreshToken(); // 256 bits aleatorios, URL-safe
        emailTokens.save(new EmailToken(user.getId(), purpose, TokenService.hash(raw), now.plus(ttl)));

        // En el fragmento (#), que el navegador no envía al servidor ni en el Referer.
        String base = props.frontendUrl().replaceAll("/+$", "");
        EmailMessage message = switch (purpose) {
            case VERIFY_EMAIL -> AccountEmailTemplates.verifyEmail(
                    user.getEmail(), user.getFullName(), base + "/#verify=" + raw, ttl);
            case RESET_PASSWORD -> AccountEmailTemplates.resetPassword(
                    user.getEmail(), user.getFullName(), base + "/#reset=" + raw, ttl);
        };
        events.publishEvent(message);
    }

    /** Marca el enlace como usado y devuelve a qué usuario pertenece. Falla si no existe, venció o ya se usó. */
    @Transactional(propagation = Propagation.MANDATORY)
    public EmailToken consume(String rawToken, EmailTokenPurpose purpose) {
        Instant now = clock.instant();
        EmailToken token = emailTokens.findByTokenHashAndPurpose(TokenService.hash(rawToken), purpose)
                .filter(t -> t.isUsable(now))
                .orElseThrow(() -> new BusinessRuleException(purpose == EmailTokenPurpose.VERIFY_EMAIL
                        ? "El enlace de verificación no es válido o ya venció. Pide uno nuevo."
                        : "El enlace para restablecer la contraseña no es válido o ya venció. Pide uno nuevo."));
        token.setUsedAt(now);
        return token;
    }

    @Transactional
    public int purgeExpiredBefore(Instant cutoff) {
        return emailTokens.deleteExpiredBefore(cutoff);
    }
}
