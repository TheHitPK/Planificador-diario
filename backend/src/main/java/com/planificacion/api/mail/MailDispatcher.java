package com.planificacion.api.mail;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Envía los correos publicados como evento:
 * <ul>
 *   <li>después del commit: nunca sale un enlace cuyo token no llegó a guardarse;</li>
 *   <li>en segundo plano: la respuesta HTTP no espera al proveedor de correo, y pedir
 *       "olvidé mi contraseña" tarda lo mismo exista o no la cuenta (no revela qué emails existen).</li>
 * </ul>
 */
@Component
public class MailDispatcher {

    private static final Logger log = LoggerFactory.getLogger(MailDispatcher.class);

    private final EmailSender sender;

    public MailDispatcher(EmailSender sender) {
        this.sender = sender;
    }

    @Async
    @TransactionalEventListener(fallbackExecution = true)
    public void dispatch(EmailMessage message) {
        try {
            sender.send(message);
            log.info("Correo enviado: \"{}\"", message.subject());
        } catch (RuntimeException e) {
            // El usuario puede pedir que se reenvíe; no hay nada más que hacer aquí.
            log.error("No se pudo enviar el correo \"{}\": {}", message.subject(), e.getMessage());
        }
    }
}
