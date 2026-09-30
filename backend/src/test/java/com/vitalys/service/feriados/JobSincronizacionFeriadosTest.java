package com.vitalys.service.feriados;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class JobSincronizacionFeriadosTest {

    private SincronizadorFeriados sincronizador;
    private JobSincronizacionFeriados job;

    @BeforeEach
    void setUp() {
        sincronizador = mock(SincronizadorFeriados.class);
        job = new JobSincronizacionFeriados(sincronizador);
    }

    @Test
    void la_corrida_diaria_dispara_la_sincronizacion() {
        when(sincronizador.sincronizar())
                .thenReturn(new ResultadoSincronizacion(List.of(2026), 3, 0, 0, 28, List.of()));

        job.corridaDiaria();

        verify(sincronizador).sincronizar();
    }

    @Test
    void una_sincronizacion_incompleta_no_rompe_la_corrida() {
        when(sincronizador.sincronizar())
                .thenReturn(
                        new ResultadoSincronizacion(
                                List.of(2026, 2027), 31, 0, 0, 0, List.of("2027: todavía no publicado")));

        // El archivo del año siguiente recién se publica sobre fin de año: que falte es esperable.
        assertThatCode(() -> job.corridaDiaria()).doesNotThrowAnyException();
    }

    @Test
    void un_fallo_inesperado_no_escapa_del_job() {
        // Si una excepción escapara, el scheduler dejaría de reprogramar la tarea y el calendario
        // no volvería a sincronizarse nunca más.
        when(sincronizador.sincronizar()).thenThrow(new IllegalStateException("la base se cayó"));

        assertThatCode(() -> job.corridaDiaria()).doesNotThrowAnyException();
    }
}
