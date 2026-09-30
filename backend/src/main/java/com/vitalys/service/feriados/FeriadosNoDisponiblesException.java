package com.vitalys.service.feriados;

/**
 * La fuente oficial de feriados no respondió, o respondió algo que no se puede interpretar.
 *
 * <p>Existe para que el sincronizador pueda distinguir "el Estado dio de baja todos los feriados
 * del año" —que no pasa nunca— de "no pude leer el archivo". Confundir las dos cosas vaciaría el
 * calendario y abriría el gimnasio un feriado.
 */
public class FeriadosNoDisponiblesException extends RuntimeException {

    public FeriadosNoDisponiblesException(String mensaje) {
        super(mensaje);
    }

    public FeriadosNoDisponiblesException(String mensaje, Throwable causa) {
        super(mensaje, causa);
    }
}
