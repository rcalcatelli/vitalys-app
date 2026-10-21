package com.vitalys.service;

import com.vitalys.exception.ConflictoException;
import com.vitalys.exception.ReglaDeNegocioException;
import java.sql.SQLException;
import org.springframework.dao.DataAccessException;

/**
 * Traduce los rechazos del motor a errores de la API. Las reglas de turnos viven en la base
 * (grilla, cupo, feriados, superposición); el servicio no las repite, pero sí tiene que
 * devolverle al cliente el motivo con el código correcto:
 *
 * <ul>
 *   <li>{@code 23514} check_violation (CHECK y los {@code RAISE} de los triggers) → 422
 *   <li>{@code 23P01} exclusion_violation y {@code 23505} unique_violation → 409
 * </ul>
 */
final class ErroresDeBase {

    private static final String CHECK = "23514";
    private static final String EXCLUSION = "23P01";
    private static final String UNICO = "23505";

    private ErroresDeBase() {}

    static RuntimeException traducir(DataAccessException ex) {
        SQLException sql = buscarSqlException(ex);
        if (sql == null) {
            return ex;
        }
        String estado = sql.getSQLState();
        if (CHECK.equals(estado)) {
            return new ReglaDeNegocioException(mensaje(sql, "El turno no cumple las reglas de reserva"));
        }
        if (EXCLUSION.equals(estado)) {
            String texto = sql.getMessage() == null ? "" : sql.getMessage();
            if (texto.contains("excl_turnos_persona_overlap")) {
                return new ConflictoException("La persona ya tiene otro turno en ese horario");
            }
            if (texto.contains("excl_turnos_overlap")) {
                return new ConflictoException("El profesional ya tiene un turno en ese horario");
            }
            return new ConflictoException("Ese horario se superpone con otro turno que ocupa el lugar");
        }
        if (UNICO.equals(estado)) {
            return new ConflictoException("Ya tenés un turno de gimnasio reservado ese día");
        }
        return ex;
    }

    private static SQLException buscarSqlException(Throwable t) {
        for (Throwable actual = t; actual != null; actual = actual.getCause()) {
            if (actual instanceof SQLException sql) {
                return sql;
            }
        }
        return null;
    }

    /**
     * El texto del {@code RAISE EXCEPTION}: primera línea del mensaje del driver, sin el prefijo
     * {@code ERROR:}. El driver de Postgres es dependencia de runtime, así que no se usa su API.
     * Un CHECK puro ("new row for relation ... violates check constraint") no es legible para
     * el usuario y se reemplaza por un texto genérico.
     */
    private static String mensaje(SQLException sql, String porDefecto) {
        String texto = sql.getMessage();
        if (texto == null) {
            return porDefecto;
        }
        String linea = texto.lines().findFirst().orElse("").replaceFirst("^ERROR:\\s*", "").trim();
        if (linea.contains("chk_turno_gym_grilla")) {
            return "Esa franja no está en la grilla del gimnasio: turnos de 60 minutos en punto, "
                    + "de lunes a viernes de 07 a 21 y los sábados de 09 a 12";
        }
        if (linea.isEmpty() || linea.startsWith("new row for relation")) {
            return porDefecto;
        }
        return linea;
    }
}
