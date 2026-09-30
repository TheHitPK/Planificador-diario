package com.planificacion.api.common.error;

/** La operación choca con el estado actual (ej. email ya registrado). */
public class ConflictException extends RuntimeException {

    public ConflictException(String message) {
        super(message);
    }
}
