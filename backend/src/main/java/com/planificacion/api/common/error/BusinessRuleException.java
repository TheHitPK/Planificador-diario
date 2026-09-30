package com.planificacion.api.common.error;

/** La petición es válida en forma pero viola una regla de negocio. */
public class BusinessRuleException extends RuntimeException {

    public BusinessRuleException(String message) {
        super(message);
    }
}
