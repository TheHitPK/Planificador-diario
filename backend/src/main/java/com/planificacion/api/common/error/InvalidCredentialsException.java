package com.planificacion.api.common.error;

/** Login o refresh token inválido. Mensaje genérico a propósito. */
public class InvalidCredentialsException extends RuntimeException {

    public InvalidCredentialsException(String message) {
        super(message);
    }
}
