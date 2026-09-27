package com.vitalys.exception;

/**
 * El body de registro público incluyó la clave {@code rol} (cualquier valor). RF-01/CA-01-7:
 * el servicio rechaza con 400 antes de crear ningún usuario.
 */
public class RolNoPermitidoException extends RuntimeException {

    public RolNoPermitidoException(String message) {
        super(message);
    }
}
