package com.vitalys.exception;

/** El recurso pedido no existe. Se mapea a 404. */
public class RecursoNoEncontradoException extends RuntimeException {

    public RecursoNoEncontradoException(String message) {
        super(message);
    }
}
