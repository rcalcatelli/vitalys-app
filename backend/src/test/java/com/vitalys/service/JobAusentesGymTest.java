package com.vitalys.service;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;

class JobAusentesGymTest {

    @Test
    void delegaEnElServicio_conYSinTurnosParaCerrar() {
        TurnoService service = mock(TurnoService.class);
        when(service.marcarAusentesVencidos()).thenReturn(2, 0);
        JobAusentesGym job = new JobAusentesGym(service);

        job.ejecutar();
        job.ejecutar();

        verify(service, times(2)).marcarAusentesVencidos();
    }
}
