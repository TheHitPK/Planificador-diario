package com.planificacion.api.mail;

/**
 * Correo listo para enviar. Se publica como evento de Spring: {@link MailDispatcher} lo envía
 * en segundo plano cuando la transacción que lo generó se confirma.
 */
public record EmailMessage(String to, String toName, String subject, String html, String text) {
}
