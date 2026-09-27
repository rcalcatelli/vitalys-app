package com.vitalys.exception;

/**
 * Login con email inexistente o contraseña incorrecta. Se mapea a 401 sin distinguir el motivo
 * (no revelar si el email existe — RF-02).
 */
public class CredencialesInvalidasException extends RuntimeException {

    public CredencialesInvalidasException(String message) {
        super(message);
    }
}
