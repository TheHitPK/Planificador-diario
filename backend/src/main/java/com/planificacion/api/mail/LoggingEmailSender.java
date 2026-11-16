package com.planificacion.api.mail;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/** Desarrollo: no envía nada, escribe el correo (con su enlace) en el log. */
public class LoggingEmailSender implements EmailSender {

    private static final Logger log = LoggerFactory.getLogger(LoggingEmailSender.class);

    @Override
    public void send(EmailMessage m) {
        log.info("""

                ===== Correo (no enviado: falta BREVO_API_KEY) =====
                Para:   {}
                Asunto: {}

                {}
                ====================================================""", m.to(), m.subject(), m.text());
    }
}
