package com.planificacion.api.common.error;

/** El recurso no existe o no pertenece al usuario (no revelamos cuál de las dos). */
public class NotFoundException extends RuntimeException {

    public NotFoundException(String resource) {
        super(resource + " no encontrado");
    }
}
