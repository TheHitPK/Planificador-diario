package com.planificacion.api.common.web;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Inyecta en un parámetro {@code UUID} el id del usuario autenticado (claim {@code sub} del JWT).
 * <pre>{@code  public List<TaskResponse> list(@CurrentUserId UUID userId) }</pre>
 */
@Target(ElementType.PARAMETER)
@Retention(RetentionPolicy.RUNTIME)
public @interface CurrentUserId {
}
