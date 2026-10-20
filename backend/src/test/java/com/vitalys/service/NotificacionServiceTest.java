package com.vitalys.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.vitalys.config.EmailProperties;
import com.vitalys.domain.Notificacion;
import com.vitalys.domain.Persona;
import com.vitalys.domain.Profesional;
import com.vitalys.domain.RolUsuario;
import com.vitalys.domain.TipoNotificacion;
import com.vitalys.domain.Turno;
import com.vitalys.domain.Usuario;
import com.vitalys.dto.NotificacionFallidaResponse;
import com.vitalys.exception.AccesoDenegadoException;
import com.vitalys.repository.NotificacionRepository;
import com.vitalys.repository.ProfesionalRepository;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.test.util.ReflectionTestUtils;

class NotificacionServiceTest {

    private static final ZoneId ZONA = ZoneId.of("America/Argentina/Buenos_Aires");
    private static final Instant AHORA = Instant.parse("2026-10-20T15:00:00Z");

    private NotificacionRepository notificacionRepository;
    private ProfesionalRepository profesionalRepository;
    private NotificacionService service;
    private final Usuario admin = usuario(1L, RolUsuario.ADMIN);

    @BeforeEach
    void setUp() {
        notificacionRepository = mock(NotificacionRepository.class);
        profesionalRepository = mock(ProfesionalRepository.class);
        EmailProperties propiedades = new EmailProperties();
        propiedades.setUmbralHuerfanas(Duration.ofMinutes(5));
        service = new NotificacionService(
                notificacionRepository, profesionalRepository, propiedades, Clock.fixed(AHORA, ZONA));
    }

    @Test
    void noAdmin_recibeAccesoDenegadoYNoConsultaNada() {
        for (RolUsuario rol : new RolUsuario[] {RolUsuario.PROFESIONAL, RolUsuario.SOCIO_PACIENTE}) {
            assertThatThrownBy(() -> service.listarFallidas(usuario(2L, rol)))
                    .isInstanceOf(AccesoDenegadoException.class);
        }
        verify(notificacionRepository, never()).buscarFallidas(anyInt(), any());
    }

    @Test
    void usaElUmbralDeHuerfanasComoLimite() {
        when(notificacionRepository.buscarFallidas(anyInt(), any())).thenReturn(List.of());

        assertThat(service.listarFallidas(admin)).isEmpty();

        ArgumentCaptor<OffsetDateTime> limite = ArgumentCaptor.forClass(OffsetDateTime.class);
        verify(notificacionRepository).buscarFallidas(eq(2), limite.capture());
        assertThat(limite.getValue().toInstant()).isEqualTo(AHORA.minusSeconds(300));
    }

    @Test
    void clasificaDefinitivasYHuerfanas_conLosDatosDelTurnoYElPaciente() {
        // 2026-10-27 13:30 en Argentina (UTC-3) = 16:30Z
        Turno turno = Turno.deGimnasio(persona(10L), 1L, OffsetDateTime.parse("2026-10-27T16:30:00Z"));
        ReflectionTestUtils.setField(turno, "id", 55L);
        ReflectionTestUtils.setField(turno, "profesionalId", 3L);

        Notificacion definitiva = notificacion(100L, turno);
        definitiva.registrarFallo(OffsetDateTime.parse("2026-10-20T11:00:00Z"), "Brevo respondió 503");
        definitiva.registrarFallo(OffsetDateTime.parse("2026-10-20T11:00:10Z"), "Brevo respondió 503");
        Notificacion huerfana = notificacion(101L, null);
        huerfana.registrarFallo(OffsetDateTime.parse("2026-10-20T10:00:00Z"), "timeout");

        Profesional profesional = new Profesional(usuario(9L, RolUsuario.PROFESIONAL));
        ReflectionTestUtils.setField(profesional, "id", 3L);
        ReflectionTestUtils.setField(profesional, "nombre", "Valentina");
        ReflectionTestUtils.setField(profesional, "apellido", "Méndez");
        when(notificacionRepository.buscarFallidas(anyInt(), any())).thenReturn(List.of(definitiva, huerfana));
        when(profesionalRepository.findAllById(List.of(3L))).thenReturn(List.of(profesional));

        List<NotificacionFallidaResponse> r = service.listarFallidas(admin);

        assertThat(r).hasSize(2);
        NotificacionFallidaResponse primera = r.get(0);
        assertThat(primera.tipo()).isEqualTo("DEFINITIVA");
        assertThat(primera.id()).isEqualTo(100L);
        assertThat(primera.pacienteNombre()).isEqualTo("Ana Gómez");
        assertThat(primera.pacienteEmail()).isEqualTo("ana@vitalys.test");
        assertThat(primera.profesionalNombre()).isEqualTo("Valentina Méndez");
        assertThat(primera.fecha()).isEqualTo(LocalDate.of(2026, 10, 27));
        assertThat(primera.hora()).isEqualTo(LocalTime.of(13, 30));
        assertThat(primera.intentos()).isEqualTo(2);
        assertThat(primera.detalleError()).isEqualTo("Brevo respondió 503");
        assertThat(primera.tipoNotificacion()).isEqualTo(TipoNotificacion.AVISO_CANCELACION);

        NotificacionFallidaResponse segunda = r.get(1);
        assertThat(segunda.tipo()).isEqualTo("HUERFANA");
        assertThat(segunda.turnoId()).isNull();
        assertThat(segunda.profesionalNombre()).isNull();
        assertThat(segunda.fecha()).isNull();
        assertThat(segunda.hora()).isNull();
    }

    private static Notificacion notificacion(Long id, Turno turno) {
        Notificacion n = Notificacion.pendiente(
                persona(10L), turno, TipoNotificacion.AVISO_CANCELACION, "ana@vitalys.test",
                OffsetDateTime.parse("2026-10-20T10:00:00Z"));
        ReflectionTestUtils.setField(n, "id", id);
        return n;
    }

    private static Persona persona(Long id) {
        Persona p = new Persona(usuario(20L, RolUsuario.SOCIO_PACIENTE), LocalDate.of(2026, 1, 1));
        ReflectionTestUtils.setField(p, "id", id);
        ReflectionTestUtils.setField(p, "nombre", "Ana");
        ReflectionTestUtils.setField(p, "apellido", "Gómez");
        return p;
    }

    private static Usuario usuario(Long id, RolUsuario rol) {
        Usuario u = new Usuario("u" + id + "@vitalys.test", "hash", rol);
        ReflectionTestUtils.setField(u, "id", id);
        return u;
    }
}
