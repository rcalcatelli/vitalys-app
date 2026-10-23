package com.vitalys.domain;

/** Espeja el ENUM nativo {@code medio_pago} (V14). Se carga a mano: no hay pasarela en el MVP. */
public enum MedioPago {
    EFECTIVO,
    TRANSFERENCIA,
    DEBITO,
    CREDITO
}
