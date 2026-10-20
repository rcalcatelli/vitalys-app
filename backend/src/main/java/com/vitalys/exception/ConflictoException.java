package com.vitalys.exception;

/** La operación choca con el estado actual de los datos (DNI repetido, baja ya aplicada). 409. */
public class ConflictoException extends RuntimeException {

    public ConflictoException(String message) {
        super(message);
    }
}
