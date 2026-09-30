package com.vitalys.domain;

/**
 * De dónde salió una fila de {@code feriados} (RF-38). La distinción existe para que el
 * sincronizador pueda borrar lo que el Estado dio de baja sin tocar lo que cargó el ADMIN.
 */
public enum OrigenFeriado {

    /** Importado del dataset oficial. El sincronizador lo actualiza y puede darlo de baja. */
    OFICIAL,

    /**
     * Cargado a mano por el ADMIN: un feriado provincial, un cierre por mantenimiento. El
     * sincronizador nunca lo toca.
     */
    MANUAL
}
