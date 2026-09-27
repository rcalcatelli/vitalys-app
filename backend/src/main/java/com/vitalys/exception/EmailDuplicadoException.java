package com.vitalys.exception;

/** El email ya existe en {@code usuarios} (constraint UNIQUE violada). Se mapea a 409. */
public class EmailDuplicadoException extends RuntimeException {

    public EmailDuplicadoException(String message) {
        super(message);
    }
}
