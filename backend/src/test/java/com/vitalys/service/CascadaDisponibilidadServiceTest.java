package com.vitalys.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.tuple;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.vitalys.domain.EstadoTurno;
import com.vitalys.domain.Notificacion;
import com.vitalys.domain.Persona;
import com.vitalys.domain.Profesional;
import com.vitalys.domain.RolUsuario;
import com.vitalys.domain.TipoNotificacion;
import com.vitalys.domain.Turno;
import com.vitalys.domain.Usuario;
import com.vitalys.dto.FranjaRequest;
import com.vitalys.dto.ImpactoResponse;
import com.vitalys.exception.ConfirmacionRequeridaException;
import com.vitalys.repository.NotificacionRepository;
import com.vitalys.repository.TurnoRepository;
import com.vitalys.service.notificaciones.NotificacionPorEnviar;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.test.util.ReflectionTestUtils;

class CascadaDisponibilidadServiceTest {

    private static final Instant AHORA = Instant.parse("2026-10-20T15:00:00Z");

    private TurnoRepository turnoRepository;
    private NotificacionRepository notificacionRepository;
    private ApplicationEventPublisher publisher;
    private CascadaDisponibilidadService service;

    private final Usuario admin = new Usuario("admin@vitalys.com", "hash", RolUsuario.ADMIN);
    private Profesional profesional;
    private final Persona ana = TurnosDePrueba.paciente(1L, "Ana", "ana@mail.test");
    private final Persona beto = TurnosDePrueba.paciente(2L, "Beto <b>", "beto@mail.test");

    @BeforeEach
    void setUp() {
        turnoRepository = mock(TurnoRepository.class);
        notificacionRepository = mock(NotificacionRepository.class);
        publisher = mock(ApplicationEventPublisher.class);
        Clock clock = Clock.fixed(AHORA, ZoneId.of("America/Argentina/Buenos_Aires"));
        service = new CascadaDisponibilidadService(turnoRepository, notificacionRepository, publisher, clock);

        admin.setId(1L);
        Usuario usuarioProf = new Usuario("prof@vitalys.com", "hash", RolUsuario.PROFESIONAL);
        usuarioProf.setId(2L);
        profesional = new Profesional(usuarioProf);
        profesional.setId(10L);
        profesional.setNombre("Valentina");
        profesional.setApellido("Méndez");

        when(notificacionRepository.save(any(Notificacion.class))).thenAnswer(inv -> {
            Notificacion n = inv.getArgument(0);
            ReflectionTestUtils.setField(n, "id", 500L + n.getPersona().getId());
            return n;
        });
    }

    private static FranjaRequest franja(int dia, String desde, String hasta) {
        return new FranjaRequest(dia, LocalTime.parse(desde), LocalTime.parse(hasta));
    }

    /** Lunes 2 de noviembre de 2026 (hora argentina), de media hora. */
    private static Turno lunes(Long id, Persona p, String hora) {
        return TurnosDePrueba.consultorio(
                id, p, 10L, "2026-11-02T" + hora + ":00-03:00", "2026-11-02T" + hora.substring(0, 2) + ":30:00-03:00");
    }

    private void futuros(Turno... turnos) {
        when(turnoRepository.futurosReservadosDeConsultorio(any(), any())).thenReturn(List.of(turnos));
    }

    @Test
    void sinImpacto_noCancelaNiAvisaNada_aunqueNoVengaConfirmacion() {
        futuros(lunes(1L, ana, "10:00"));

        ImpactoResponse r = service.resolver(admin, profesional, List.of(franja(1, "09:00", "13:00")), false, "m");

        assertThat(r.hayImpacto()).isFalse();
        verify(turnoRepository, never()).saveAllAndFlush(any());
        verify(publisher, never()).publishEvent(any(Object.class));
    }

    @Test
    void conImpactoSinConfirmar_lanza409ConLaListaYNoToca() {
        Turno t = lunes(1L, ana, "10:00");
        futuros(t);

        assertThatThrownBy(() -> service.resolver(admin, profesional, List.of(), false, "m"))
                .isInstanceOfSatisfying(ConfirmacionRequeridaException.class, e -> {
                    assertThat(e.getImpacto().cantidad()).isEqualTo(1);
                    assertThat(e.getImpacto().turnos().get(0).paciente()).isEqualTo("Ana Prueba");
                });

        assertThat(t.getEstado()).isEqualTo(EstadoTurno.RESERVADO);
        verify(turnoRepository, never()).saveAllAndFlush(any());
        verify(publisher, never()).publishEvent(any(Object.class));
    }

    @Test
    void confirmado_cancelaConLosTresDatosYUnAvisoPorPaciente() {
        Turno a1 = lunes(1L, ana, "10:00");
        Turno a2 = lunes(2L, ana, "11:00");
        Turno b1 = lunes(3L, beto, "12:00");
        futuros(a1, a2, b1);

        ImpactoResponse r = service.resolver(admin, profesional, List.of(), true, "Baja");

        assertThat(r.cantidad()).isEqualTo(3);
        OffsetDateTime esperado = OffsetDateTime.ofInstant(AHORA, ZoneId.of("America/Argentina/Buenos_Aires"));
        for (Turno t : List.of(a1, a2, b1)) {
            assertThat(t.getEstado()).isEqualTo(EstadoTurno.CANCELADO_POR_PROFESIONAL);
            assertThat(t.getCanceladoEn()).isEqualTo(esperado);
            assertThat(t.getCanceladoPorUsuarioId()).isEqualTo(1L);
            assertThat(t.getMotivoCancelacion()).isEqualTo("Baja");
        }
        verify(turnoRepository).saveAllAndFlush(List.of(a1, a2, b1));

        ArgumentCaptor<Notificacion> notificaciones = ArgumentCaptor.forClass(Notificacion.class);
        verify(notificacionRepository, times(2)).save(notificaciones.capture());
        assertThat(notificaciones.getAllValues())
                .extracting(
                        n -> n.getPersona().getId(),
                        n -> n.getTurno().getId(),
                        Notificacion::getTipo,
                        Notificacion::isExitoso)
                .containsExactly(
                        tuple(1L, 1L, TipoNotificacion.AVISO_CANCELACION, false),
                        tuple(2L, 3L, TipoNotificacion.AVISO_CANCELACION, false));

        ArgumentCaptor<Object> eventos = ArgumentCaptor.forClass(Object.class);
        verify(publisher, times(2)).publishEvent(eventos.capture());
        NotificacionPorEnviar paraAna = (NotificacionPorEnviar) eventos.getAllValues().get(0);
        assertThat(paraAna.notificacionId()).isEqualTo(501L);
        assertThat(paraAna.asunto()).isEqualTo("Se cancelaron tus turnos con Valentina Méndez");
        assertThat(paraAna.contenidoHtml()).contains("02/11/2026 10:00").contains("02/11/2026 11:00");
        NotificacionPorEnviar paraBeto = (NotificacionPorEnviar) eventos.getAllValues().get(1);
        assertThat(paraBeto.asunto()).isEqualTo("Se canceló tu turno con Valentina Méndez");
        assertThat(paraBeto.contenidoHtml()).contains("&lt;b&gt;").doesNotContain("<b>");
    }

    @Test
    void pacienteSinEmail_laNotificacionNaceFallidaDefinitivaYNoSePublicaEvento() {
        Persona sinEmail = TurnosDePrueba.paciente(3L, "Carla", "");
        futuros(lunes(1L, sinEmail, "10:00"));

        service.resolver(admin, profesional, List.of(), true, "m");

        ArgumentCaptor<Notificacion> captor = ArgumentCaptor.forClass(Notificacion.class);
        verify(notificacionRepository).save(captor.capture());
        assertThat(captor.getValue().esDefinitiva()).isTrue();
        assertThat(captor.getValue().getIntentos()).isEqualTo(2);
        assertThat(captor.getValue().getDetalleError()).contains("no tiene email");
        verify(publisher, never()).publishEvent(any(Object.class));
    }

    @Test
    void impacto_esSoloLectura() {
        futuros(lunes(1L, ana, "10:00"));

        assertThat(service.impacto(10L, List.of()).cantidad()).isEqualTo(1);

        verify(turnoRepository, never()).saveAllAndFlush(any());
        verify(notificacionRepository, never()).save(any());
    }
}
