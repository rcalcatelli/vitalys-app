package com.vitalys.service.notificaciones;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.vitalys.domain.Notificacion;
import com.vitalys.domain.Persona;
import com.vitalys.domain.RolUsuario;
import com.vitalys.domain.TipoNotificacion;
import com.vitalys.domain.Usuario;
import com.vitalys.repository.NotificacionRepository;
import com.vitalys.repository.PersonaRepository;
import com.vitalys.service.MorosidadService;
import com.vitalys.service.MorosidadService.EstadoDeuda;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;

/** RF-37: un aviso por período impago, de deuda o de suspensión según el umbral. */
class AvisosDeudaServiceTest {

    private static final LocalDate SEPTIEMBRE = LocalDate.of(2026, 9, 1);

    private PersonaRepository personaRepository;
    private MorosidadService morosidadService;
    private NotificacionRepository notificacionRepository;
    private ApplicationEventPublisher publisher;
    private AvisosDeudaService service;

    @BeforeEach
    void setUp() {
        personaRepository = mock(PersonaRepository.class);
        morosidadService = mock(MorosidadService.class);
        notificacionRepository = mock(NotificacionRepository.class);
        publisher = mock(ApplicationEventPublisher.class);
        ZoneId zona = ZoneId.of("America/Argentina/Buenos_Aires");
        service = new AvisosDeudaService(
                personaRepository, morosidadService, notificacionRepository, publisher,
                Clock.fixed(Instant.parse("2026-10-23T12:00:00Z"), zona));
        when(notificacionRepository.save(any(Notificacion.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    private Persona socio(long id, String email) {
        Persona p = new Persona(new Usuario(email, "x", RolUsuario.SOCIO_PACIENTE), LocalDate.of(2024, 1, 1));
        p.setId(id);
        p.setNombre("Ana");
        p.setApellido("Paz");
        p.definirMembresiaGym(true, LocalDate.of(2026, 1, 1));
        return p;
    }

    private void socios(Persona... personas) {
        when(personaRepository.findAll(any(Specification.class), any(Sort.class))).thenReturn(List.of(personas));
    }

    private Notificacion guardada() {
        ArgumentCaptor<Notificacion> captor = ArgumentCaptor.forClass(Notificacion.class);
        verify(notificacionRepository).save(captor.capture());
        return captor.getValue();
    }

    private NotificacionPorEnviar publicada() {
        ArgumentCaptor<NotificacionPorEnviar> captor = ArgumentCaptor.forClass(NotificacionPorEnviar.class);
        verify(publisher).publishEvent(captor.capture());
        return captor.getValue();
    }

    @Test
    void conDeudaPorDebajoDelUmbral_avisoDeDeudaConLoQueFalta() {
        Persona ana = socio(1, "ana@mail.com");
        socios(ana);
        when(morosidadService.ultimoPeriodoImpago(ana)).thenReturn(Optional.of(SEPTIEMBRE));
        when(morosidadService.evaluar(ana)).thenReturn(new EstadoDeuda(2, 6, false));

        assertThat(service.avisarDeudas()).isEqualTo(1);

        Notificacion n = guardada();
        assertThat(n.getTipo()).isEqualTo(TipoNotificacion.AVISO_DEUDA);
        assertThat(n.getPeriodo()).isEqualTo(SEPTIEMBRE);
        NotificacionPorEnviar e = publicada();
        assertThat(e.asunto()).isEqualTo("Tenés 2 cuotas impagas");
        assertThat(e.contenidoHtml()).contains("septiembre de 2026").contains("te faltan 4").contains("seguir reservando");
    }

    @Test
    void alAlcanzarElUmbral_avisoDeSuspension() {
        Persona ana = socio(1, "ana@mail.com");
        socios(ana);
        when(morosidadService.ultimoPeriodoImpago(ana)).thenReturn(Optional.of(SEPTIEMBRE));
        when(morosidadService.evaluar(ana)).thenReturn(new EstadoDeuda(6, 6, true));

        service.avisarDeudas();

        assertThat(guardada().getTipo()).isEqualTo(TipoNotificacion.AVISO_SUSPENSION);
        NotificacionPorEnviar e = publicada();
        assertThat(e.asunto()).isEqualTo("Tu reserva de gimnasio quedó suspendida");
        assertThat(e.contenidoHtml()).contains("no podés reservar").contains("consultorio no cambian");
    }

    @Test
    void periodoYaAvisadoOSinDeuda_noAvisaDeNuevo() {
        Persona avisada = socio(1, "a@mail.com");
        Persona alDia = socio(2, "b@mail.com");
        socios(avisada, alDia);
        when(morosidadService.ultimoPeriodoImpago(avisada)).thenReturn(Optional.of(SEPTIEMBRE));
        when(notificacionRepository.existsByPersonaIdAndPeriodo(1L, SEPTIEMBRE)).thenReturn(true);
        when(morosidadService.ultimoPeriodoImpago(alDia)).thenReturn(Optional.empty());

        assertThat(service.avisarDeudas()).isZero();
        verify(notificacionRepository, never()).save(any());
    }

    @Test
    void socioSinEmail_quedaFallidaYNoSePublica() {
        Persona sinEmail = socio(1, "");
        socios(sinEmail);
        when(morosidadService.ultimoPeriodoImpago(sinEmail)).thenReturn(Optional.of(SEPTIEMBRE));
        when(morosidadService.evaluar(sinEmail)).thenReturn(new EstadoDeuda(1, 6, false));

        service.avisarDeudas();

        assertThat(guardada().esDefinitiva()).isTrue();
        verify(publisher, never()).publishEvent(any());
    }

    @Test
    void textosEnSingular() {
        assertThat(AvisosDeudaService.asunto(new EstadoDeuda(1, 6, false))).isEqualTo("Tenés 1 cuota impaga");
        assertThat(AvisosDeudaService.cuerpo(socio(1, "a@mail.com"), SEPTIEMBRE, new EstadoDeuda(5, 6, false)))
                .contains("(te falta 1)");
        assertThat(AvisosDeudaService.cuerpo(socio(1, "a@mail.com"), SEPTIEMBRE, new EstadoDeuda(1, 6, false)))
                .contains("1 período impago.");
    }

    @Test
    void elJobDelega() {
        AvisosDeudaService avisos = mock(AvisosDeudaService.class);
        when(avisos.avisarDeudas()).thenReturn(3, 0);
        JobAvisosDeuda job = new JobAvisosDeuda(avisos);
        job.ejecutar();
        job.ejecutar();
        verify(avisos, times(2)).avisarDeudas();
    }
}
