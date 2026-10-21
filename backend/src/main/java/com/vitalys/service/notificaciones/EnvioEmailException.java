package com.vitalys.service.notificaciones;

/** El proveedor de email no aceptó el envío. El despachador la captura: nunca llega al usuario. */
public class EnvioEmailException extends RuntimeException {

    public EnvioEmailException(String message) {
        super(message);
    }

    public EnvioEmailException(String message, Throwable cause) {
        super(message, cause);
    }
}
