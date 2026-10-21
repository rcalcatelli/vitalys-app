package com.vitalys.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.OffsetDateTime;
import org.junit.jupiter.api.Test;

/** TU-01/TU-02 y su equivalente de gimnasio: la anticipación decide en tiempo o tarde (RN-02). */
class TurnoTest {

    private static final OffsetDateTime T = OffsetDateTime.parse("2026-10-26T10:00:00-03:00");

    private static Turno gym(OffsetDateTime inicio) {
        return Turno.deGimnasio(new Persona(new Usuario("a@b.c", "x", RolUsuario.SOCIO_PACIENTE), T.toLocalDate()), 1L, inicio);
    }

    @Test
    void laFranjaDeGimnasioDuraUnaHoraYNoTieneProfesional() {
        Turno t = gym(T);
        assertThat(t.getFin()).isEqualTo(T.plusHours(1));
        assertThat(t.getProfesionalId()).isNull();
        assertThat(t.getTipoTurno()).isEqualTo(TipoTurno.GYM);
        assertThat(t.estaReservado()).isTrue();
    }

    @Test
    void gym_conExactamenteDosHoras_esEnTiempo() {
        Turno t = gym(T);
        t.cancelar(T.minusHours(2), 5L, "viaje");
        assertThat(t.getEstado()).isEqualTo(EstadoTurno.CANCELADO_EN_TIEMPO);
        assertThat(t.getCanceladoPorUsuarioId()).isEqualTo(5L);
        assertThat(t.getMotivoCancelacion()).isEqualTo("viaje");
        assertThat(t.getCanceladoEn()).isEqualTo(T.minusHours(2));
    }

    @Test
    void gym_conUnaHoraCincuentaYNueve_esTarde() {
        Turno t = gym(T);
        t.cancelar(T.minusHours(2).plusMinutes(1), 5L, "viaje");
        assertThat(t.getEstado()).isEqualTo(EstadoTurno.CANCELADO_TARDE);
    }

    @Test
    void gym_conLaFranjaYaEmpezada_esTarde() {
        Turno t = gym(T);
        t.cancelar(T.plusMinutes(5), 5L, "llegué tarde");
        assertThat(t.getEstado()).isEqualTo(EstadoTurno.CANCELADO_TARDE);
        assertThat(t.estaReservado()).isFalse();
    }

    @Test
    void cancelarPorProfesional_registraQuienCuandoYPorQue_sinAtribuirloAlPaciente() {
        Turno t = gym(T);
        t.cancelarPorProfesional(T.minusHours(1), 9L, "Baja del profesional");

        assertThat(t.getEstado()).isEqualTo(EstadoTurno.CANCELADO_POR_PROFESIONAL);
        assertThat(t.getCanceladoEn()).isEqualTo(T.minusHours(1));
        assertThat(t.getCanceladoPorUsuarioId()).isEqualTo(9L);
        assertThat(t.getMotivoCancelacion()).isEqualTo("Baja del profesional");
        assertThat(t.estaReservado()).isFalse();
    }

    @Test
    void consultorioExigeVeinticuatroHoras() {
        assertThat(gym(T).anticipacionRequerida()).isEqualTo(Turno.ANTICIPACION_GYM);
        assertThat(Turno.ANTICIPACION_CONSULTORIO.toHours()).isEqualTo(24);
    }
}
