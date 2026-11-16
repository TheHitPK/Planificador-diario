package com.planificacion.api.common.error;

/** La contraseña es correcta pero el usuario aún no confirmó su correo. */
public class EmailNotVerifiedException extends RuntimeException {

    /** Valor de la propiedad {@code code} del problem+json, para que el cliente ofrezca reenviar el correo. */
    public static final String CODE = "EMAIL_NOT_VERIFIED";

    public EmailNotVerifiedException() {
        super("Confirma tu correo para iniciar sesión. Revisa tu bandeja de entrada (y la de spam).");
    }
}
