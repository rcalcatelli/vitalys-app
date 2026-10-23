package com.vitalys.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.vitalys.domain.ExcepcionMorosidad;
import com.vitalys.domain.Persona;
import com.vitalys.domain.RolUsuario;
import com.vitalys.domain.Usuario;
import com.vitalys.dto.ExcepcionMorosidadRequest;
import com.vitalys.dto.ExcepcionMorosidadResponse;
import com.vitalys.exception.AccesoDenegadoException;
import com.vitalys.exception.DatosInvalidosException;
import com.vitalys.exception.RecursoNoEncontradoException;
import com.vitalys.exception.ReglaDeNegocioException;
import com.vitalys.repository.ExcepcionMorosidadRepository;
import com.vitalys.repository.PersonaRepository;
import com.vitalys.service.MorosidadService.EstadoDeuda;
import com.vitalys.service.MorosidadService.VeredictoMorosidad;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class ExcepcionMorosidadServiceTest {

    private ExcepcionMorosidadRepository excepcionRepository;
    private PersonaRepository personaRepository;
    private MorosidadService morosidadService;
    private ExcepcionMorosidadService service;

    private final Usuario admin = usuario(1L, RolUsuario.ADMIN);
    private final Persona socia = persona(10L);

    @BeforeEach
    void setUp() {
        excepcionRepository = mock(ExcepcionMorosidadRepository.class);
        personaRepository = mock(PersonaRepository.class);
        morosidadService = mock(MorosidadService.class);
        Clock clock = Clock.fixed(Instant.parse("2026-10-20T15:00:00Z"), ZoneId.of("America/Argentina/Buenos_Aires"));
        service = new ExcepcionMorosidadService(excepcionRepository, personaRepository, morosidadService, clock);
        when(excepcionRepository.save(any(ExcepcionMorosidad.class))).thenAnswer(inv -> inv.getArgument(0));
        when(personaRepository.findById(10L)).thenReturn(Optional.of(socia));
    }

    private static Usuario usuario(Long id, RolUsuario rol) {
        Usuario u = new Usuario("u" + id + "@mail.com", "hash", rol);
        u.setId(id);
        return u;
    }

    private static Persona persona(Long id) {
        Persona p = new Persona(usuario(id + 100, RolUsuario.SOCIO_PACIENTE), LocalDate.of(2026, 1, 1));
        p.setId(id);
        p.definirMembresiaGym(true, LocalDate.of(2026, 1, 1));
        return p;
    }

    private static ExcepcionMorosidadRequest pedido() {
        return new ExcepcionMorosidadRequest(10L, " Plan de pago ", LocalDate.of(2026, 11, 20), true);
    }

    private void veredicto(EstadoDeuda deuda, Optional<ExcepcionMorosidad> excepcion) {
        when(morosidadService.veredicto(socia)).thenReturn(new VeredictoMorosidad(deuda, excepcion));
    }

    @Test
    void pi137_crear_socioSuspendido_guardaLaExcepcion() {
        veredicto(new EstadoDeuda(3, 3, true), Optional.empty());

        ExcepcionMorosidadResponse r = service.crear(admin, pedido());

        assertThat(r.personaId()).isEqualTo(10L);
        assertThat(r.motivo()).isEqualTo("Plan de pago");
        verify(excepcionRepository).save(any(ExcepcionMorosidad.class));
    }

    @Test
    void pi137_crear_socioConDeudaBajoElUmbral_da422SinGuardar() {
        veredicto(new EstadoDeuda(2, 3, false), Optional.empty());

        assertThatThrownBy(() -> service.crear(admin, pedido()))
                .isInstanceOf(ReglaDeNegocioException.class)
                .hasMessageContaining("no está suspendida por morosidad");
        verify(excepcionRepository, never()).save(any());
    }

    @Test
    void pi137_crear_personaSinMembresiaDeGimnasio_da422SinGuardar() {
        veredicto(EstadoDeuda.SIN_MEMBRESIA, Optional.empty());

        assertThatThrownBy(() -> service.crear(admin, pedido())).isInstanceOf(ReglaDeNegocioException.class);
        verify(excepcionRepository, never()).save(any());
    }

    @Test
    void crear_suspendidoConExcepcionVigente_permiteRenovarla() {
        ExcepcionMorosidad vigente = new ExcepcionMorosidad(10L, 1L, "previa", LocalDate.of(2026, 10, 25), false);
        veredicto(new EstadoDeuda(4, 3, true), Optional.of(vigente));

        assertThat(service.crear(admin, pedido()).personaId()).isEqualTo(10L);
        verify(excepcionRepository).save(any(ExcepcionMorosidad.class));
    }

    @Test
    void crear_noAdmin_da403() {
        Usuario socio = usuario(2L, RolUsuario.SOCIO_PACIENTE);

        assertThatThrownBy(() -> service.crear(socio, pedido())).isInstanceOf(AccesoDenegadoException.class);
    }

    @Test
    void crear_personaInexistente_da404() {
        ExcepcionMorosidadRequest otra = new ExcepcionMorosidadRequest(99L, "x", LocalDate.of(2026, 11, 20), true);

        assertThatThrownBy(() -> service.crear(admin, otra)).isInstanceOf(RecursoNoEncontradoException.class);
    }

    @Test
    void crear_vencimientoPasado_da400() {
        ExcepcionMorosidadRequest pasada = new ExcepcionMorosidadRequest(10L, "x", LocalDate.of(2026, 10, 19), true);

        assertThatThrownBy(() -> service.crear(admin, pasada)).isInstanceOf(DatosInvalidosException.class);
    }
}
