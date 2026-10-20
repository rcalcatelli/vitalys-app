package com.vitalys.exception;

/**
 * La operación es válida en forma pero la rechaza una regla de negocio (morosidad, grilla del
 * gimnasio, cupo, estado del turno). Se mapea a 422.
 */
public class ReglaDeNegocioException extends RuntimeException {

    public ReglaDeNegocioException(String message) {
        super(message);
    }
}
