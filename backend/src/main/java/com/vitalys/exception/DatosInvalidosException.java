package com.vitalys.exception;

/** Regla de validación que depende de más de un campo y no expresa Bean Validation. 400. */
public class DatosInvalidosException extends RuntimeException {

    public DatosInvalidosException(String message) {
        super(message);
    }
}
