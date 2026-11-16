package com.planificacion.api.mail;

import com.planificacion.api.config.AppProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.scheduling.annotation.EnableAsync;

@Configuration
@EnableAsync
public class MailConfig {

    private static final Logger log = LoggerFactory.getLogger(MailConfig.class);

    /**
     * Con BREVO_API_KEY se envía de verdad; sin ella, los correos van al log.
     * En producción, activar el correo sin clave es un error de configuración: la app no arranca.
     */
    @Bean
    EmailSender emailSender(AppProperties props, Environment env) {
        AppProperties.Mail mail = props.mail();
        boolean hasKey = mail.brevoApiKey() != null && !mail.brevoApiKey().isBlank();
        if (!mail.enabled()) {
            log.info("Correo desactivado (MAIL_ENABLED=false): registro sin verificación y sin recuperación por email");
            return new LoggingEmailSender();
        }
        if (!hasKey) {
            if (env.acceptsProfiles(Profiles.of("prod"))) {
                throw new IllegalStateException("MAIL_ENABLED=true requiere BREVO_API_KEY");
            }
            log.warn("BREVO_API_KEY no definida: los correos se escribirán en el log en lugar de enviarse");
            return new LoggingEmailSender();
        }
        return new BrevoEmailSender(mail.brevoApiKey(), mail.fromEmail(), mail.fromName());
    }
}
