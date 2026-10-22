package com.vitalys.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.vitalys.exception.ConflictoException;
import com.vitalys.exception.ReglaDeNegocioException;
import java.sql.SQLException;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.DataIntegrityViolationException;

class ErroresDeBaseTest {

    private static DataAccessException error(String mensaje, String estado) {
        return new DataIntegrityViolationException("rechazo", new SQLException(mensaje, estado));
    }

    @Test
    void sinSqlException_devuelveLaMismaExcepcion() {
        DataAccessException ex = new DataIntegrityViolationException("sin causa");

        assertThat(ErroresDeBase.traducir(ex)).isSameAs(ex);
    }

    @Test
    void estadoDesconocido_devuelveLaMismaExcepcion() {
        DataAccessException ex = error("otra cosa", "23502");

        assertThat(ErroresDeBase.traducir(ex)).isSameAs(ex);
    }

    @Test
    void cuotaDuplicada_es409ConTextoDePago() {
        RuntimeException r = ErroresDeBase.traducir(
                error("ERROR: duplicate key value violates unique constraint \"uq_cuota_mensual\"", "23505"));

        assertThat(r).isInstanceOf(ConflictoException.class).hasMessageContaining("cuota de ese período");
    }

    @Test
    void pagoDuplicadoPorTurno_es409() {
        RuntimeException r = ErroresDeBase.traducir(
                error("ERROR: duplicate key value violates unique constraint \"uq_pago_por_turno\"", "23505"));

        assertThat(r).isInstanceOf(ConflictoException.class).hasMessage("Ese turno ya tiene un pago registrado");
    }

    @Test
    void otroUnico_conservaElTextoDeTurnos() {
        RuntimeException r = ErroresDeBase.traducir(error("duplicate key \"uq_turno_gym_dia\"", "23505"));

        assertThat(r).isInstanceOf(ConflictoException.class).hasMessageContaining("turno de gimnasio");
    }

    @Test
    void unicoSinMensaje_conservaElTextoDeTurnos() {
        RuntimeException r = ErroresDeBase.traducir(error(null, "23505"));

        assertThat(r).isInstanceOf(ConflictoException.class).hasMessageContaining("turno de gimnasio");
    }

    @Test
    void conceptoDatos_es422() {
        RuntimeException r = ErroresDeBase.traducir(error(
                "ERROR: new row for relation \"pagos\" violates check constraint \"chk_concepto_datos\"", "23514"));

        assertThat(r).isInstanceOf(ReglaDeNegocioException.class).hasMessageContaining("Una cuota lleva");
    }

    @Test
    void montoPositivo_es422() {
        RuntimeException r = ErroresDeBase.traducir(error(
                "ERROR: new row for relation \"pagos\" violates check constraint \"chk_monto_positivo\"", "23514"));

        assertThat(r).isInstanceOf(ReglaDeNegocioException.class).hasMessage("El monto debe ser mayor a cero");
    }

    @Test
    void triggerDeSesion_es422ConElTextoDelRaise() {
        RuntimeException r = ErroresDeBase.traducir(
                error("ERROR: El turno 5 es de tipo GYM: un pago SESION_CONSULTORIO solo puede asociarse a un turno de CONSULTORIO.\n  Where: PL/pgSQL", "23514"));

        assertThat(r).isInstanceOf(ReglaDeNegocioException.class).hasMessageStartingWith("El turno 5 es de tipo GYM");
    }

    @Test
    void checkPuro_usaElTextoGenerico() {
        RuntimeException r = ErroresDeBase.traducir(error("new row for relation \"turnos\" violates check constraint \"x\"", "23514"));

        assertThat(r).isInstanceOf(ReglaDeNegocioException.class).hasMessage("El turno no cumple las reglas de reserva");
    }

    @Test
    void claveForaneaDeTurno_es422() {
        RuntimeException r = ErroresDeBase.traducir(error(
                "ERROR: insert or update on table \"pagos\" violates foreign key constraint \"pagos_turno_id_fkey\"", "23503"));

        assertThat(r).isInstanceOf(ReglaDeNegocioException.class).hasMessage("El turno indicado no existe");
    }

    @Test
    void claveForaneaDeOtraCosa_es422Generico() {
        RuntimeException r = ErroresDeBase.traducir(error("violates foreign key constraint \"pagos_persona_id_fkey\"", "23503"));
        RuntimeException sinTexto = ErroresDeBase.traducir(error(null, "23503"));

        assertThat(r).isInstanceOf(ReglaDeNegocioException.class).hasMessage("Alguno de los datos indicados no existe");
        assertThat(sinTexto).isInstanceOf(ReglaDeNegocioException.class);
    }

    @Test
    void exclusion_conservaLosTextosDeTurnos() {
        assertThat(ErroresDeBase.traducir(error("excl_turnos_persona_overlap", "23P01")))
                .hasMessage("La persona ya tiene otro turno en ese horario");
        assertThat(ErroresDeBase.traducir(error("excl_turnos_overlap", "23P01")))
                .hasMessage("El profesional ya tiene un turno en ese horario");
        assertThat(ErroresDeBase.traducir(error(null, "23P01")))
                .hasMessageContaining("se superpone");
    }
}
