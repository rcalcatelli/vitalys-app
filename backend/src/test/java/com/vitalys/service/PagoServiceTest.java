package com.vitalys.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.vitalys.domain.ConceptoPago;
import com.vitalys.domain.EstadoTurno;
import com.vitalys.domain.ExcepcionMorosidad;
import com.vitalys.domain.MedioPago;
import com.vitalys.domain.Pago;
import com.vitalys.domain.Persona;
import com.vitalys.domain.RolUsuario;
import com.vitalys.domain.Turno;
import com.vitalys.domain.Usuario;
import com.vitalys.dto.EstadoCuentaResponse;
import com.vitalys.dto.PagoResponse;
import com.vitalys.dto.RegistrarPagoRequest;
import com.vitalys.exception.AccesoDenegadoException;
import com.vitalys.exception.ConflictoException;
import com.vitalys.exception.RecursoNoEncontradoException;
import com.vitalys.exception.ReglaDeNegocioException;
import com.vitalys.repository.PagoRepository;
import com.vitalys.repository.PersonaRepository;
import com.vitalys.repository.TurnoRepository;
import com.vitalys.service.MorosidadService.EstadoDeuda;
import com.vitalys.service.MorosidadService.EstadoPeriodo;
import com.vitalys.service.MorosidadService.VeredictoMorosidad;
import java.math.BigDecimal;
import java.sql.SQLException;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.dao.DataIntegrityViolationException;

class PagoServiceTest {

    private static final BigDecimal MONTO = new BigDecimal("15000.00");

    private PagoRepository pagoRepository;
    private PersonaRepository personaRepository;
    private TurnoRepository turnoRepository;
    private MorosidadService morosidadService;
    private PagoService service;

    private final Usuario admin = usuario(1L, RolUsuario.ADMIN);
    private final Persona socia = persona(10L, true, LocalDate.of(2026, 3, 15));

    @BeforeEach
    void setUp() {
        pagoRepository = mock(PagoRepository.class);
        personaRepository = mock(PersonaRepository.class);
        turnoRepository = mock(TurnoRepository.class);
        morosidadService = mock(MorosidadService.class);
        Clock clock = Clock.fixed(Instant.parse("2026-10-20T15:00:00Z"), ZoneId.of("America/Argentina/Buenos_Aires"));
        service = new PagoService(pagoRepository, personaRepository, turnoRepository, morosidadService, clock);
        when(pagoRepository.saveAndFlush(any(Pago.class))).thenAnswer(inv -> inv.getArgument(0));
        when(personaRepository.findById(10L)).thenReturn(Optional.of(socia));
    }

    private static Usuario usuario(Long id, RolUsuario rol) {
        Usuario u = new Usuario("u" + id + "@mail.com", "hash", rol);
        u.setId(id);
        return u;
    }

    private static Persona persona(Long id, boolean gym, LocalDate inicio) {
        Persona p = new Persona(usuario(id + 100, RolUsuario.SOCIO_PACIENTE), LocalDate.of(2026, 1, 1));
        p.setId(id);
        p.definirMembresiaGym(gym, inicio);
        return p;
    }

    private static RegistrarPagoRequest cuota(LocalDate periodo) {
        return new RegistrarPagoRequest(10L, ConceptoPago.CUOTA_MENSUAL, MONTO, MedioPago.EFECTIVO, periodo, null);
    }

    private static RegistrarPagoRequest sesion(Long turnoId) {
        return new RegistrarPagoRequest(10L, ConceptoPago.SESION_CONSULTORIO, MONTO, MedioPago.TRANSFERENCIA, null, turnoId);
    }

    private Turno turno(EstadoTurno estado) {
        Turno t = TurnosDePrueba.consultorio(
                7L, socia, 3L, "2026-10-01T12:00:00Z", "2026-10-01T12:30:00Z");
        t.marcar(estado);
        return t;
    }

    @Test
    void registrar_cuotaDelMesDeInicio_guardaConMedioFechaYAdmin() {
        PagoResponse r = service.registrar(admin, cuota(LocalDate.of(2026, 3, 1)));

        ArgumentCaptor<Pago> captor = ArgumentCaptor.forClass(Pago.class);
        verify(pagoRepository).saveAndFlush(captor.capture());
        Pago guardado = captor.getValue();
        assertThat(guardado.getPersonaId()).isEqualTo(10L);
        assertThat(guardado.getMedio()).isEqualTo(MedioPago.EFECTIVO);
        assertThat(guardado.getRegistradoPorUsuario()).isEqualTo(1L);
        assertThat(guardado.getFechaPago().toInstant()).isEqualTo(Instant.parse("2026-10-20T15:00:00Z"));
        assertThat(r.concepto()).isEqualTo(ConceptoPago.CUOTA_MENSUAL);
        assertThat(r.monto()).isEqualByComparingTo(MONTO);
    }

    @Test
    void registrar_cuotaDePeriodoFuturo_sePermite() {
        PagoResponse r = service.registrar(admin, cuota(LocalDate.of(2027, 1, 1)));

        assertThat(r.periodo()).isEqualTo(LocalDate.of(2027, 1, 1));
    }

    @Test
    void registrar_periodoConDiaDistintoDeUno_noSePrevalida() {
        // PI-80: lo rechaza el motor (chk_concepto_datos), no el servicio
        PagoResponse r = service.registrar(admin, cuota(LocalDate.of(2026, 5, 17)));

        assertThat(r.periodo()).isEqualTo(LocalDate.of(2026, 5, 17));
    }

    @Test
    void registrar_cuotaSinPeriodo_dejaQueLaBaseLaRechace() {
        service.registrar(admin, cuota(null));

        verify(pagoRepository).saveAndFlush(any(Pago.class));
    }

    @Test
    void registrar_comoNoAdmin_esAccesoDenegado() {
        for (RolUsuario rol : new RolUsuario[] {RolUsuario.SOCIO_PACIENTE, RolUsuario.PROFESIONAL}) {
            assertThatThrownBy(() -> service.registrar(usuario(5L, rol), cuota(LocalDate.of(2026, 3, 1))))
                    .isInstanceOf(AccesoDenegadoException.class);
        }
        verifyNoInteractions(pagoRepository, personaRepository);
    }

    @Test
    void registrar_personaInexistente_es404() {
        when(personaRepository.findById(99L)).thenReturn(Optional.empty());
        RegistrarPagoRequest request =
                new RegistrarPagoRequest(99L, ConceptoPago.CUOTA_MENSUAL, MONTO, MedioPago.DEBITO, LocalDate.of(2026, 3, 1), null);

        assertThatThrownBy(() -> service.registrar(admin, request)).isInstanceOf(RecursoNoEncontradoException.class);
        verify(pagoRepository, never()).saveAndFlush(any());
    }

    @Test
    void registrar_cuotaDePersonaQueNoEsSocia_es422() {
        when(personaRepository.findById(11L)).thenReturn(Optional.of(persona(11L, false, null)));
        RegistrarPagoRequest request =
                new RegistrarPagoRequest(11L, ConceptoPago.CUOTA_MENSUAL, MONTO, MedioPago.CREDITO, LocalDate.of(2026, 3, 1), null);

        assertThatThrownBy(() -> service.registrar(admin, request)).isInstanceOf(ReglaDeNegocioException.class);
        verify(pagoRepository, never()).saveAndFlush(any());
    }

    @Test
    void registrar_cuotaAnteriorAlInicioDeLaMembresia_es422() {
        assertThatThrownBy(() -> service.registrar(admin, cuota(LocalDate.of(2026, 2, 1))))
                .isInstanceOf(ReglaDeNegocioException.class);
    }

    @Test
    void registrar_sesionDeTurnoReservado_sePermite() {
        when(turnoRepository.findById(7L)).thenReturn(Optional.of(turno(EstadoTurno.COMPLETADO)));

        PagoResponse r = service.registrar(admin, sesion(7L));

        assertThat(r.turnoId()).isEqualTo(7L);
        assertThat(r.medio()).isEqualTo(MedioPago.TRANSFERENCIA);
    }

    @Test
    void registrar_sesionDeTurnoCancelado_es422_encualquieraDeLosTresEstados() {
        for (EstadoTurno estado : new EstadoTurno[] {
            EstadoTurno.CANCELADO_EN_TIEMPO, EstadoTurno.CANCELADO_TARDE, EstadoTurno.CANCELADO_POR_PROFESIONAL
        }) {
            when(turnoRepository.findById(7L)).thenReturn(Optional.of(turno(estado)));

            assertThatThrownBy(() -> service.registrar(admin, sesion(7L)))
                    .isInstanceOf(ReglaDeNegocioException.class);
        }
        verify(pagoRepository, never()).saveAndFlush(any());
    }

    @Test
    void registrar_sesionDeTurnoInexistente_dejaQueLaClaveForaneaLaRechace() {
        when(turnoRepository.findById(404L)).thenReturn(Optional.empty());

        service.registrar(admin, sesion(404L));

        verify(pagoRepository).saveAndFlush(any(Pago.class));
    }

    @Test
    void registrar_sesionSinTurno_dejaQueLaBaseLaRechace() {
        service.registrar(admin, sesion(null));

        verifyNoInteractions(turnoRepository);
        verify(pagoRepository).saveAndFlush(any(Pago.class));
    }

    @Test
    void registrar_conRechazoDelMotor_traduceElError() {
        when(pagoRepository.saveAndFlush(any(Pago.class)))
                .thenThrow(new DataIntegrityViolationException(
                        "x", new SQLException("duplicate key value violates unique constraint \"uq_cuota_mensual\"", "23505")));

        assertThatThrownBy(() -> service.registrar(admin, cuota(LocalDate.of(2026, 3, 1))))
                .isInstanceOf(ConflictoException.class)
                .hasMessageContaining("cuota");
    }

    // ------------------------------------------------------------------ estado de cuenta

    private static Pago cuotaPaga(LocalDate periodo) {
        return new Pago(10L, ConceptoPago.CUOTA_MENSUAL, MONTO, MedioPago.EFECTIVO, periodo, null, 1L,
                OffsetDateTime.parse("2026-10-01T10:00:00-03:00"));
    }

    private void deuda(int impagos, int umbral, boolean suspendido, ExcepcionMorosidad excepcion) {
        when(morosidadService.veredicto(socia))
                .thenReturn(new VeredictoMorosidad(new EstadoDeuda(impagos, umbral, suspendido), Optional.ofNullable(excepcion)));
    }

    @Test
    void estadoCuenta_adminVeDetalleDePeriodosYTotales() {
        // hoy = 2026-10-20 (BA); inicio 2026-03: marzo a septiembre vencidos, octubre en curso
        deuda(5, 6, false, null);
        when(pagoRepository.findByPersonaIdOrderByFechaPagoDesc(10L))
                .thenReturn(List.of(cuotaPaga(LocalDate.of(2026, 9, 1)), cuotaPaga(LocalDate.of(2026, 3, 1))));

        EstadoCuentaResponse r = service.estadoCuenta(admin, 10L);

        assertThat(r.periodosImpagos()).isEqualTo(5);
        assertThat(r.suspendido()).isFalse();
        assertThat(r.excepcion()).isNull();
        assertThat(r.periodos()).hasSize(8);
        assertThat(r.periodos().get(0).estado()).isEqualTo(EstadoPeriodo.PAGADO);
        assertThat(r.periodos().get(0).pago()).isNotNull();
        assertThat(r.periodos().get(1).estado()).isEqualTo(EstadoPeriodo.IMPAGO);
        assertThat(r.periodos().get(1).pago()).isNull();
        assertThat(r.periodos().get(7).estado()).isEqualTo(EstadoPeriodo.PENDIENTE);
        assertThat(r.totales().cantidadPagos()).isEqualTo(2);
        assertThat(r.totales().montoTotal()).isEqualByComparingTo("30000.00");
    }

    @Test
    void estadoCuenta_suspendidoConExcepcionVigente_noSuspendidoYMuestraLaExcepcion() {
        // Caso Juan Garcia del seed: 6 impagos = umbral, habilitado por una excepcion vigente
        ExcepcionMorosidad vigente = new ExcepcionMorosidad(10L, 1L, "plan de pago", LocalDate.of(2026, 10, 31), false);
        deuda(6, 6, true, vigente);
        when(pagoRepository.findByPersonaIdOrderByFechaPagoDesc(10L)).thenReturn(List.of());

        EstadoCuentaResponse r = service.estadoCuenta(admin, 10L);

        assertThat(r.periodosImpagos()).isEqualTo(6);
        assertThat(r.suspendido()).isFalse();
        assertThat(r.excepcion().validaHasta()).isEqualTo(LocalDate.of(2026, 10, 31));
        assertThat(r.excepcion().motivo()).isEqualTo("plan de pago");
    }

    @Test
    void estadoCuenta_suspendidoSinExcepcion_suspendidoYSinExcepcion() {
        deuda(6, 6, true, null);
        when(pagoRepository.findByPersonaIdOrderByFechaPagoDesc(10L)).thenReturn(List.of());

        EstadoCuentaResponse r = service.estadoCuenta(admin, 10L);

        assertThat(r.suspendido()).isTrue();
        assertThat(r.excepcion()).isNull();
    }

    @Test
    void estadoCuenta_sesionesConFechaDelTurno() {
        deuda(0, 6, false, null);
        Pago sesionPaga = new Pago(10L, ConceptoPago.SESION_CONSULTORIO, MONTO, MedioPago.TRANSFERENCIA, null, 7L, 1L,
                OffsetDateTime.parse("2026-10-02T10:00:00-03:00"));
        Turno t = turno(EstadoTurno.COMPLETADO);
        t.setId(7L);
        when(pagoRepository.findByPersonaIdOrderByFechaPagoDesc(10L)).thenReturn(List.of(sesionPaga));
        when(turnoRepository.findAllById(List.of(7L))).thenReturn(List.of(t));

        EstadoCuentaResponse r = service.estadoCuenta(admin, 10L);

        assertThat(r.sesiones()).hasSize(1);
        assertThat(r.sesiones().get(0).turnoId()).isEqualTo(7L);
        assertThat(r.sesiones().get(0).fechaTurno()).isEqualTo(t.getInicio());
        assertThat(r.totales().cantidadPagos()).isEqualTo(1);
    }

    @Test
    void estadoCuenta_noSocioGym_sinPeriodos() {
        Persona soloConsultorio = persona(11L, false, null);
        when(personaRepository.findById(11L)).thenReturn(Optional.of(soloConsultorio));
        when(morosidadService.veredicto(soloConsultorio))
                .thenReturn(new VeredictoMorosidad(EstadoDeuda.SIN_MEMBRESIA, Optional.empty()));
        when(pagoRepository.findByPersonaIdOrderByFechaPagoDesc(11L)).thenReturn(List.of());

        EstadoCuentaResponse r = service.estadoCuenta(admin, 11L);

        assertThat(r.esSocioGym()).isFalse();
        assertThat(r.periodos()).isEmpty();
        assertThat(r.umbral()).isZero();
    }

    @Test
    void estadoCuenta_personaInexistente_404() {
        assertThatThrownBy(() -> service.estadoCuenta(admin, 404L)).isInstanceOf(RecursoNoEncontradoException.class);
    }

    @Test
    void estadoCuenta_socioVeLaPropiaPeroNoLaAjena_yProfesionalNo() {
        deuda(0, 6, false, null);
        when(pagoRepository.findByPersonaIdOrderByFechaPagoDesc(10L)).thenReturn(List.of());
        Usuario duenio = usuario(110L, RolUsuario.SOCIO_PACIENTE);
        when(personaRepository.findByUsuarioId(110L)).thenReturn(Optional.of(socia));

        assertThat(service.estadoCuenta(duenio, 10L).personaId()).isEqualTo(10L);
        assertThat(service.miEstadoCuenta(duenio).personaId()).isEqualTo(10L);
        assertThatThrownBy(() -> service.estadoCuenta(duenio, 99L)).isInstanceOf(AccesoDenegadoException.class);
        assertThatThrownBy(() -> service.estadoCuenta(usuario(4L, RolUsuario.PROFESIONAL), 10L))
                .isInstanceOf(AccesoDenegadoException.class);
        assertThatThrownBy(() -> service.miEstadoCuenta(usuario(4L, RolUsuario.PROFESIONAL)))
                .isInstanceOf(AccesoDenegadoException.class);
    }

    @Test
    void miEstadoCuenta_sinFicha_422() {
        Usuario sinFicha = usuario(50L, RolUsuario.SOCIO_PACIENTE);
        when(personaRepository.findByUsuarioId(50L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.miEstadoCuenta(sinFicha)).isInstanceOf(ReglaDeNegocioException.class);
        assertThatThrownBy(() -> service.estadoCuenta(sinFicha, 10L)).isInstanceOf(ReglaDeNegocioException.class);
    }
}
