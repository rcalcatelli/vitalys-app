package com.vitalys.exception;

/**
 * El actor autenticado no puede operar sobre ese recurso. Lo lanza el servicio, no el filtro
 * (RNF-03). Se mapea a 403.
 */
public class AccesoDenegadoException extends RuntimeException {

    public AccesoDenegadoException(String message) {
        super(message);
    }
}
