package com.planificacion.api.common.error;

/** Un servicio externo (ej. la API de tasas) no respondió como se esperaba. */
public class ExternalServiceException extends RuntimeException {

    public ExternalServiceException(String message, Throwable cause) {
        super(message, cause);
    }
}
