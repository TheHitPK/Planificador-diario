package com.planificacion.api.mail;

/** Envía un correo. Implementaciones: {@link BrevoEmailSender} (producción) y {@link LoggingEmailSender} (desarrollo). */
public interface EmailSender {

    void send(EmailMessage message);
}
