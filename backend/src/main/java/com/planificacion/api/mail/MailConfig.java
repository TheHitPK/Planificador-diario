package com.planificacion.api.mail;

import com.planificacion.api.config.AppProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;

@Configuration
@EnableAsync
public class MailConfig {

    private static final Logger log = LoggerFactory.getLogger(MailConfig.class);

    /** Con BREVO_API_KEY se envía de verdad; sin ella, los correos van al log. */
    @Bean
    EmailSender emailSender(AppProperties props) {
        AppProperties.Mail mail = props.mail();
        if (mail.brevoApiKey() == null || mail.brevoApiKey().isBlank()) {
            log.warn("BREVO_API_KEY no definida: los correos se escribirán en el log en lugar de enviarse");
            return new LoggingEmailSender();
        }
        return new BrevoEmailSender(mail.brevoApiKey(), mail.fromEmail(), mail.fromName());
    }
}
