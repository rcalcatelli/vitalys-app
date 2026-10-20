package com.vitalys.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.vitalys.domain.Persona;
import com.vitalys.domain.Turno;
import com.vitalys.dto.FranjaRequest;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.List;
import org.junit.jupiter.api.Test;

/** Casos borde del cálculo de impacto de RN-24, en hora argentina (UTC-3). 2026-11-02 es lunes. */
class ImpactoCalculatorTest {

    private static final OffsetDateTime AHORA = OffsetDateTime.parse("2026-10-20T12:00:00-03:00");
    private static final Persona ANA = TurnosDePrueba.paciente(1L, "Ana", "ana@mail.test");

    private static FranjaRequest franja(int dia, String desde, String hasta) {
        return new FranjaRequest(dia, LocalTime.parse(desde), LocalTime.parse(hasta));
    }

    private static Turno turno(String inicio, String fin) {
        return TurnosDePrueba.consultorio(1L, ANA, 10L, inicio, fin);
    }

    private static List<Turno> afectados(Turno t, FranjaRequest... franjas) {
        return ImpactoCalculator.afectados(List.of(t), List.of(franjas), AHORA);
    }

    @Test
    void ajusteExacto_noEsAfectado() {
        assertThat(afectados(turno("2026-11-02T09:00:00-03:00", "2026-11-02T09:30:00-03:00"), franja(1, "09:00", "09:30")))
                .isEmpty();
    }

    @Test
    void contenidoEnLaFranja_noEsAfectado() {
        assertThat(afectados(turno("2026-11-02T10:00:00-03:00", "2026-11-02T10:30:00-03:00"), franja(1, "09:00", "13:00")))
                .isEmpty();
    }

    @Test
    void solapamientoParcial_esAfectado() {
        // el turno termina 10 minutos después de que cierra la franja
        assertThat(afectados(turno("2026-11-02T12:40:00-03:00", "2026-11-02T13:10:00-03:00"), franja(1, "09:00", "13:00")))
                .hasSize(1);
        // y empieza antes de que abra
        assertThat(afectados(turno("2026-11-02T08:45:00-03:00", "2026-11-02T09:15:00-03:00"), franja(1, "09:00", "13:00")))
                .hasSize(1);
    }

    @Test
    void otroDiaDeLaSemana_esAfectado() {
        assertThat(afectados(turno("2026-11-02T10:00:00-03:00", "2026-11-02T10:30:00-03:00"), franja(2, "09:00", "13:00")))
                .hasSize(1);
    }

    @Test
    void sinFranjas_todosSonAfectados() {
        assertThat(afectados(turno("2026-11-02T10:00:00-03:00", "2026-11-02T10:30:00-03:00")))
                .hasSize(1);
    }

    @Test
    void turnoPasado_nuncaSeToca() {
        assertThat(afectados(turno("2026-10-19T10:00:00-03:00", "2026-10-19T10:30:00-03:00")))
                .isEmpty();
        // el que ya empezó tampoco: inicio igual al ahora no es futuro
        assertThat(afectados(turno("2026-10-20T12:00:00-03:00", "2026-10-20T12:30:00-03:00")))
                .isEmpty();
    }

    @Test
    void franjasAdyacentes_noSeSuman_unTurnoQueCruzaElLimiteEsAfectado() {
        assertThat(afectados(
                        turno("2026-11-02T10:45:00-03:00", "2026-11-02T11:15:00-03:00"),
                        franja(1, "09:00", "11:00"),
                        franja(1, "11:00", "13:00")))
                .hasSize(1);
    }

    @Test
    void franjasAdyacentes_unTurnoQueEntraEnUnaDeEllasNoEsAfectado() {
        assertThat(afectados(
                        turno("2026-11-02T11:00:00-03:00", "2026-11-02T11:30:00-03:00"),
                        franja(1, "09:00", "11:00"),
                        franja(1, "11:00", "13:00")))
                .isEmpty();
    }

    @Test
    void elDiaSeMideEnHoraArgentina_noEnUtc() {
        // 2026-11-02T22:00-03:00 ya es martes en UTC, pero en Argentina sigue siendo lunes
        assertThat(afectados(turno("2026-11-02T22:00:00-03:00", "2026-11-02T22:30:00-03:00"), franja(1, "21:00", "23:00")))
                .isEmpty();
        assertThat(afectados(turno("2026-11-02T22:00:00-03:00", "2026-11-02T22:30:00-03:00"), franja(2, "00:00", "02:00")))
                .hasSize(1);
    }

    @Test
    void turnoQueCruzaLaMedianoche_esAfectado() {
        assertThat(afectados(turno("2026-11-02T23:45:00-03:00", "2026-11-03T00:15:00-03:00"), franja(1, "20:00", "23:59")))
                .hasSize(1);
    }
}
