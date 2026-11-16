package com.planificacion.api.common.error;

/** Se pidió una función que necesita enviar correos, pero el correo está desactivado ({@code MAIL_ENABLED=false}). */
public class MailDisabledException extends RuntimeException {

    public MailDisabledException() {
        super("El envío de correos no está activo en este servidor");
    }
}
