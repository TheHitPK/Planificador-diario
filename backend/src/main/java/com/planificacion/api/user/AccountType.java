package com.planificacion.api.user;

/**
 * Tipo de cuenta, elegido al registrarse.
 * Una cuenta de empresa solo usa planificación, disciplinas y pendientes (sin finanzas ni nutrición).
 */
public enum AccountType {
    PERSONAL,
    BUSINESS
}
