package com.vitalys.service.feriados;

import java.util.List;

/**
 * Qué hizo una corrida del sincronizador (RF-38). Se devuelve al ADMIN que la dispara a mano y se
 * escribe en el log de la corrida programada.
 *
 * @param anios años que se intentaron sincronizar
 * @param altas feriados nuevos
 * @param modificaciones feriados que ya existían y cambiaron de nombre o de tipo
 * @param bajas feriados que el Estado sacó del calendario y se dieron de baja
 * @param sinCambios feriados que ya estaban igual
 * @param errores un mensaje por cada año que no se pudo sincronizar; el calendario de ese año
 *     queda como estaba
 */
public record ResultadoSincronizacion(
        List<Integer> anios,
        int altas,
        int modificaciones,
        int bajas,
        int sinCambios,
        List<String> errores) {

    /** {@code true} si todos los años pedidos se sincronizaron. */
    public boolean exitoso() {
        return errores.isEmpty();
    }

    /** {@code true} si algo cambió respecto de lo que ya había en la base. */
    public boolean huboCambios() {
        return altas > 0 || modificaciones > 0 || bajas > 0;
    }

    public String resumen() {
        return "años=%s altas=%d modificaciones=%d bajas=%d sin_cambios=%d errores=%d"
                .formatted(anios, altas, modificaciones, bajas, sinCambios, errores.size());
    }
}
