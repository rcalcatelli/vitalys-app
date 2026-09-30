package com.vitalys.domain;

/**
 * Clasificación de un día no laborable según el dataset oficial del Ministerio del Interior
 * (RF-38). El orden de declaración define la precedencia cuando la fuente lista más de una
 * festividad en la misma fecha: {@code feriados.fecha} es clave primaria, así que se conserva
 * la de mayor peso — ver {@link #superaA(TipoFeriado)}.
 */
public enum TipoFeriado {

    /** Fecha fija por ley. El gimnasio no abre. */
    INAMOVIBLE,

    /** Feriado que el decreto anual corre a otra fecha. El gimnasio no abre. */
    TRASLADABLE,

    /** Día no laborable con fines turísticos ("puente"). El gimnasio no abre. */
    TURISTICO,

    /**
     * Festividad religiosa que rige para quien la profesa, no para el establecimiento: el
     * gimnasio <strong>sí</strong> abre. Es el único tipo que no implica cierre.
     */
    NO_LABORABLE;

    /** Si este tipo, por sí solo, implica que el gimnasio no abre. */
    public boolean implicaCierre() {
        return this != NO_LABORABLE;
    }

    /** {@code true} si este tipo tiene más peso que {@code otro} al resolver una fecha repetida. */
    public boolean superaA(TipoFeriado otro) {
        return otro == null || this.ordinal() < otro.ordinal();
    }

    /**
     * Traduce el valor que publica la fuente oficial ({@code inamovible}, {@code trasladable},
     * {@code turistico}, {@code no_laborable}) al enum.
     *
     * @return el tipo, o {@code null} si la fuente trae un valor que no conocemos — en ese caso
     *     la fila se descarta en lugar de adivinar si cierra o no.
     */
    public static TipoFeriado desdeValorOficial(String valor) {
        if (valor == null) {
            return null;
        }
        return switch (valor.trim().toLowerCase()) {
            case "inamovible" -> INAMOVIBLE;
            case "trasladable" -> TRASLADABLE;
            case "turistico", "turístico", "puente" -> TURISTICO;
            case "no_laborable", "no laborable" -> NO_LABORABLE;
            default -> null;
        };
    }
}
