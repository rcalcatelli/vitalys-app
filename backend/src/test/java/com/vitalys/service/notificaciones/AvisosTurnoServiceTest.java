package com.vitalys.service.notificaciones;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
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
import com.vitalys.repository.NotificacionRepository;
import com.vitalys.repository.ProfesionalRepository;
import com.vitalys.repository.TurnoRepository;
import java.lang.reflect.Field;
import java.time.Clock;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.context.ApplicationEventPublisher;

/** RF-26 a RF-28: qué aviso se registra, a quién y qué dice. */
class AvisosTurnoServiceTest {

    private static final ZoneId ZONA = ZoneId.of("America/Argentina/Buenos_Aires");
    private static final OffsetDateTime AHORA = OffsetDateTime.parse("2026-10-26T09:00:00-03:00");

    private NotificacionRepository notificacionRepository;
    private ProfesionalRepository profesionalRepository;
    private TurnoRepository turnoRepository;
    private ApplicationEventPublisher publisher;
    private AvisosTurnoService avisos;
    private Persona maria;

    @BeforeEach
    void setUp() {
        notificacionRepository = mock(NotificacionRepository.class);
        profesionalRepository = mock(ProfesionalRepository.class);
        turnoRepository = mock(TurnoRepository.class);
        publisher = mock(ApplicationEventPublisher.class);
        avisos = new AvisosTurnoService(
                notificacionRepository, profesionalRepository, turnoRepository, publisher, Clock.fixed(AHORA.toInstant(), ZONA));
        when(notificacionRepository.save(any(Notificacion.class))).thenAnswer(inv -> inv.getArgument(0));

        maria = persona("maria@mail.com");
        Profesional valentina = new Profesional(new Usuario("nutri@vitalys.com", "x", RolUsuario.PROFESIONAL));
        valentina.setNombre("Valentina");
        valentina.setApellido("Méndez");
        when(profesionalRepository.findById(8L)).thenReturn(Optional.of(valentina));
    }

    private static Persona persona(String email) {
        Persona p = new Persona(new Usuario(email, "x", RolUsuario.SOCIO_PACIENTE), LocalDate.of(2024, 1, 1));
        p.setNombre("María");
        p.setApellido("Pérez");
        return p;
    }

    private static void creadoEn(Turno t, OffsetDateTime cuando) throws Exception {
        Field f = Turno.class.getDeclaredField("creadoEn");
        f.setAccessible(true);
        f.set(t, cuando);
    }

    private NotificacionPorEnviar eventoPublicado() {
        ArgumentCaptor<NotificacionPorEnviar> captor = ArgumentCaptor.forClass(NotificacionPorEnviar.class);
        verify(publisher).publishEvent(captor.capture());
        return captor.getValue();
    }

    private Notificacion notificacionGuardada() {
        ArgumentCaptor<Notificacion> captor = ArgumentCaptor.forClass(Notificacion.class);
        verify(notificacionRepository).save(captor.capture());
        return captor.getValue();
    }

    @Test
    void confirmacionDeConsultorio_nombraAlProfesionalYElPlazoDe24h() {
        OffsetDateTime inicio = OffsetDateTime.parse("2026-10-28T09:00:00-03:00");
        avisos.confirmarReserva(Turno.deConsultorio(maria, 8L, 1L, inicio, inicio.plusMinutes(30)));

        Notificacion n = notificacionGuardada();
        assertThat(n.getTipo()).isEqualTo(TipoNotificacion.CONFIRMACION_TURNO);
        assertThat(n.getEmailDestino()).isEqualTo("maria@mail.com");
        NotificacionPorEnviar e = eventoPublicado();
        assertThat(e.asunto()).isEqualTo("Turno confirmado: consulta con Valentina Méndez, 28/10/2026 a las 09:00");
        assertThat(e.contenidoHtml()).contains("Hola María").contains("24 horas");
    }

    @Test
    void confirmacionDeGimnasio_hablaDe2h() {
        avisos.confirmarReserva(Turno.deGimnasio(maria, 1L, OffsetDateTime.parse("2026-10-27T10:00:00-03:00")));

        NotificacionPorEnviar e = eventoPublicado();
        assertThat(e.asunto()).startsWith("Turno confirmado: gimnasio, 27/10/2026");
        assertThat(e.contenidoHtml()).contains("2 horas");
    }

    @Test
    void avisoDeCancelacionTardia_loAclara() {
        Turno t = Turno.deGimnasio(maria, 1L, AHORA.plusHours(1));
        t.cancelar(AHORA, 1L, "viaje");

        avisos.avisarCancelacion(t);

        assertThat(notificacionGuardada().getTipo()).isEqualTo(TipoNotificacion.AVISO_CANCELACION);
        assertThat(eventoPublicado().contenidoHtml()).contains("fuera de término");
    }

    @Test
    void socioSinEmail_quedaComoFallidaDefinitivaYNoSePublica() {
        avisos.confirmarReserva(Turno.deGimnasio(persona(""), 1L, AHORA.plusDays(1)));

        Notificacion n = notificacionGuardada();
        assertThat(n.esDefinitiva()).isTrue();
        verify(publisher, never()).publishEvent(any());
    }

    @Test
    void recordatorios_soloParaLosReservadosConMasDe24hDeAnticipacion() throws Exception {
        Turno viejo = Turno.deGimnasio(maria, 1L, AHORA.plusHours(20));
        creadoEn(viejo, AHORA.minusDays(3));
        Turno reciente = Turno.deGimnasio(persona("otro@mail.com"), 1L, AHORA.plusHours(22));
        creadoEn(reciente, AHORA.minusHours(1));
        when(turnoRepository.buscarSinRecordatorio(
                        eq(EstadoTurno.RESERVADO), eq(TipoNotificacion.RECORDATORIO), eq(AHORA), eq(AHORA.plusHours(24))))
                .thenReturn(List.of(viejo, reciente));

        assertThat(avisos.enviarRecordatorios()).isEqualTo(1);
        assertThat(notificacionGuardada().getTipo()).isEqualTo(TipoNotificacion.RECORDATORIO);
        assertThat(eventoPublicado().asunto()).startsWith("Recordatorio: gimnasio");
    }

    @Test
    void jobDeRecordatorios_delegaEnElServicio() {
        AvisosTurnoService servicio = mock(AvisosTurnoService.class);
        when(servicio.enviarRecordatorios()).thenReturn(2, 0);
        JobRecordatorios job = new JobRecordatorios(servicio);
        job.ejecutar();
        job.ejecutar();
        verify(servicio, org.mockito.Mockito.times(2)).enviarRecordatorios();
    }
}
