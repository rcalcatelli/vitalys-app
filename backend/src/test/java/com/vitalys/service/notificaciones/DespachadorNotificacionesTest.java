package com.vitalys.service.notificaciones;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.vitalys.config.EmailProperties;
import com.vitalys.domain.Notificacion;
import com.vitalys.domain.TipoNotificacion;
import com.vitalys.repository.NotificacionRepository;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.scheduling.TaskScheduler;

/**
 * El scheduler está simulado: el reintento se captura y se ejecuta a mano, así que ningún test
 * espera los 10 segundos reales.
 */
class DespachadorNotificacionesTest {

    private static final Instant AHORA = Instant.parse("2026-10-20T15:00:00Z");

    private NotificacionRepository repository;
    private NotificadorEmail notificador;
    private TaskScheduler scheduler;
    private DespachadorNotificaciones despachador;
    private Notificacion notificacion;
    private final NotificacionPorEnviar evento = new NotificacionPorEnviar(7L, "Turno cancelado", "<p>Hola</p>");

    @BeforeEach
    void setUp() {
        repository = mock(NotificacionRepository.class);
        notificador = mock(NotificadorEmail.class);
        scheduler = mock(TaskScheduler.class);
        Clock clock = Clock.fixed(AHORA, ZoneId.of("America/Argentina/Buenos_Aires"));
        EmailProperties propiedades = new EmailProperties();
        propiedades.setReintentoDelay(Duration.ofSeconds(10));

        notificacion = Notificacion.pendiente(
                null, null, TipoNotificacion.AVISO_CANCELACION, "paciente@vitalys.test", OffsetDateTime.now(clock));
        when(repository.findById(7L)).thenReturn(Optional.of(notificacion));
        when(repository.save(any(Notificacion.class))).thenAnswer(i -> i.getArgument(0));

        despachador = new DespachadorNotificaciones(repository, notificador, scheduler, propiedades, clock);
    }

    @Test
    void envioExitoso_marcaExitosoConUnIntentoYNoReintenta() {
        despachador.despachar(evento);

        verify(notificador).enviar("paciente@vitalys.test", "Turno cancelado", "<p>Hola</p>");
        assertThat(notificacion.isExitoso()).isTrue();
        assertThat(notificacion.getIntentos()).isEqualTo(1);
        assertThat(notificacion.getUltimoIntentoEn()).isNotNull();
        assertThat(notificacion.getDetalleError()).isNull();
        verify(scheduler, never()).schedule(any(Runnable.class), any(Instant.class));
    }

    @Test
    void primerFallo_agendaUnReintentoConElDelayConfigurado() {
        doThrow(new EnvioEmailException("Brevo respondió 503")).when(notificador).enviar(any(), any(), any());

        despachador.despachar(evento);

        assertThat(notificacion.isExitoso()).isFalse();
        assertThat(notificacion.getIntentos()).isEqualTo(1);
        assertThat(notificacion.getDetalleError()).contains("503");
        ArgumentCaptor<Instant> cuando = ArgumentCaptor.forClass(Instant.class);
        verify(scheduler).schedule(any(Runnable.class), cuando.capture());
        assertThat(cuando.getValue()).isEqualTo(AHORA.plusSeconds(10));
    }

    @Test
    void reintentoExitoso_dejaLaFilaExitosaConDosIntentos() {
        doThrow(new EnvioEmailException("timeout")).doNothing().when(notificador).enviar(any(), any(), any());

        despachador.despachar(evento);
        ejecutarReintentoAgendado();

        assertThat(notificacion.isExitoso()).isTrue();
        assertThat(notificacion.getIntentos()).isEqualTo(2);
        assertThat(notificacion.getDetalleError()).isNull();
        verify(notificador, times(2)).enviar(any(), any(), any());
    }

    @Test
    void segundoFallo_dejaFallidaDefinitivaYNoVuelveAReintentar() {
        doThrow(new EnvioEmailException("sigue caído")).when(notificador).enviar(any(), any(), any());

        despachador.despachar(evento);
        ejecutarReintentoAgendado();

        assertThat(notificacion.isExitoso()).isFalse();
        assertThat(notificacion.getIntentos()).isEqualTo(2);
        assertThat(notificacion.getDetalleError()).isEqualTo("sigue caído");
        assertThat(notificacion.esDefinitiva()).isTrue();
        // Un solo reintento en total: el del primer fallo
        verify(scheduler, times(1)).schedule(any(Runnable.class), any(Instant.class));
    }

    @Test
    void fallosInesperadosDelProveedor_tambienSeCapturan() {
        doThrow(new IllegalStateException("explotó")).when(notificador).enviar(any(), any(), any());

        despachador.despachar(evento);

        assertThat(notificacion.getDetalleError()).isEqualTo("explotó");
        verify(scheduler).schedule(any(Runnable.class), any(Instant.class));
    }

    @Test
    void notificacionYaResuelta_noSeVuelveAEnviar() {
        notificacion.registrarExito(OffsetDateTime.now());

        despachador.despachar(evento);

        verify(notificador, never()).enviar(any(), any(), any());
    }

    @Test
    void notificacionDefinitiva_noSeVuelveAEnviar() {
        notificacion.registrarFallo(OffsetDateTime.now(), "a");
        notificacion.registrarFallo(OffsetDateTime.now(), "b");

        despachador.despachar(evento);

        verify(notificador, never()).enviar(any(), any(), any());
    }

    @Test
    void notificacionInexistente_seIgnoraSinFallar() {
        when(repository.findById(eq(99L))).thenReturn(Optional.empty());

        despachador.despachar(new NotificacionPorEnviar(99L, "x", "y"));

        verify(notificador, never()).enviar(any(), any(), any());
    }

    @Test
    void siFallaLaPersistencia_laExcepcionNoSePropaga() {
        when(repository.save(any(Notificacion.class))).thenThrow(new IllegalStateException("base caída"));

        despachador.alConfirmarTransaccion(evento);

        verify(notificador).enviar(any(), any(), any());
    }

    @Test
    void textoDeErrorMuyLargo_seTrunca() {
        doThrow(new EnvioEmailException("e".repeat(5000))).when(notificador).enviar(any(), any(), any());

        despachador.despachar(evento);

        assertThat(notificacion.getDetalleError()).hasSize(1000);
    }

    private void ejecutarReintentoAgendado() {
        ArgumentCaptor<Runnable> tarea = ArgumentCaptor.forClass(Runnable.class);
        verify(scheduler).schedule(tarea.capture(), any(Instant.class));
        tarea.getValue().run();
    }
}
