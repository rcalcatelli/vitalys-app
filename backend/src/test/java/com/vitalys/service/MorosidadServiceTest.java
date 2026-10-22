package com.vitalys.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.vitalys.domain.Persona;
import com.vitalys.domain.RolUsuario;
import com.vitalys.domain.Usuario;
import com.vitalys.domain.ExcepcionMorosidad;
import com.vitalys.repository.ExcepcionMorosidadRepository;
import com.vitalys.service.MorosidadService.EstadoDeuda;
import com.vitalys.service.MorosidadService.EstadoPeriodo;
import com.vitalys.service.MorosidadService.PeriodoEstado;
import com.vitalys.service.MorosidadService.VeredictoMorosidad;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

/** PU-01 a PU-05 y PU-08 a PU-12 (definicion-pruebas.md): RN-01 con umbral de tolerancia. */
class MorosidadServiceTest {

    private static final ZoneId ZONA = ZoneId.of("America/Argentina/Buenos_Aires");

    private final ExcepcionMorosidadRepository excepciones = mock(ExcepcionMorosidadRepository.class);

    private static LocalDate d(String iso) {
        return LocalDate.parse(iso);
    }

    @Test
    void pu01_todosLosPeriodosPagados() {
        assertThat(MorosidadService.contarImpagos(d("2026-07-01"), Set.of(d("2026-07-01"), d("2026-08-01"), d("2026-09-01")), d("2026-09-25")))
                .isZero();
    }

    @Test
    void pu02_vencidoHaceExactamenteDiezDias_todaviaNoCuenta() {
        assertThat(MorosidadService.contarImpagos(d("2026-06-01"), Set.of(d("2026-06-01"), d("2026-08-01")), d("2026-08-11")))
                .isZero();
    }

    @Test
    void pu03_mesSalteadoConPosterioresPagados_sumaUno() {
        assertThat(MorosidadService.contarImpagos(d("2026-06-01"), Set.of(d("2026-06-01"), d("2026-08-01")), d("2026-08-12")))
                .isEqualTo(1);
    }

    @Test
    void pu04_sinNingunPago() {
        assertThat(MorosidadService.contarImpagos(d("2026-01-01"), Set.of(), d("2026-09-25"))).isEqualTo(8);
    }

    @Test
    void pu08_mesSalteadoEnMedioDelHistorial() {
        assertThat(MorosidadService.contarImpagos(
                        d("2026-05-01"), Set.of(d("2026-05-01"), d("2026-07-01"), d("2026-08-01")), d("2026-08-20")))
                .isEqualTo(1);
    }

    @Test
    void pu09_socioNuevoNoArrancaDebiendo() {
        assertThat(MorosidadService.contarImpagos(d("2026-09-01"), Set.of(), d("2026-09-05"))).isZero();
    }

    @Test
    void inicioAMitadDeMes_cuentaDesdeElPrimeroDeEseMes() {
        assertThat(MorosidadService.contarImpagos(d("2026-07-15"), Set.of(), d("2026-08-12"))).isEqualTo(1);
    }

    private MorosidadService servicio(List<LocalDate> pagos, int umbral, String hoy) {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        when(jdbc.queryForList(anyString(), eq(LocalDate.class), any(Object[].class))).thenReturn(pagos);
        when(jdbc.queryForObject(anyString(), eq(Integer.class))).thenReturn(umbral);
        Clock clock = Clock.fixed(d(hoy).atTime(12, 0).atZone(ZONA).toInstant(), ZONA);
        return new MorosidadService(jdbc, excepciones, clock);
    }

    private static Persona socio(String inicioMembresia) {
        Usuario u = new Usuario("s@mail.com", "x", RolUsuario.SOCIO_PACIENTE);
        Persona p = new Persona(u, d("2024-01-01"));
        p.setId(7L);
        p.definirMembresiaGym(true, inicioMembresia == null ? null : d(inicioMembresia));
        return p;
    }

    @Test
    void pu05_sinMembresiaGym_noConsultaPagos() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        Usuario u = new Usuario("c@mail.com", "x", RolUsuario.SOCIO_PACIENTE);
        Persona p = new Persona(u, d("2024-01-01"));
        p.definirMembresiaGym(false, null);

        EstadoDeuda estado = new MorosidadService(jdbc, excepciones, Clock.systemUTC()).evaluar(p);

        assertThat(estado.suspendido()).isFalse();
        verifyNoInteractions(jdbc);
    }

    @Test
    void pu10_unoPorDebajoDelUmbral_noSuspende() {
        // 2026-01 a 2026-05 impagos (5) con hoy = 2026-06-20
        EstadoDeuda e = servicio(List.of(), 6, "2026-06-20").evaluar(socio("2026-01-01"));
        assertThat(e.periodosImpagos()).isEqualTo(5);
        assertThat(e.suspendido()).isFalse();
    }

    @Test
    void pu11_igualAlUmbral_suspende() {
        EstadoDeuda e = servicio(List.of(), 6, "2026-07-20").evaluar(socio("2026-01-01"));
        assertThat(e.periodosImpagos()).isEqualTo(6);
        assertThat(e.suspendido()).isTrue();
    }

    @Test
    void pu12_elUmbralSaleDeLaConfiguracion() {
        List<LocalDate> pagos = List.of(d("2026-06-01"), d("2026-08-01"));
        assertThat(servicio(pagos, 6, "2026-09-20").evaluar(socio("2026-06-01")).suspendido()).isFalse();
        assertThat(servicio(pagos, 1, "2026-09-20").evaluar(socio("2026-06-01")).suspendido()).isTrue();
    }

    // ------------------------------------------------------------------ detalle por periodo

    @Test
    void periodos_hoyIgualAlLimite_sigueSiendoPendiente() {
        // Periodo 2026-06: vence 2026-07-01, limite 2026-07-11
        List<PeriodoEstado> r = MorosidadService.periodos(d("2026-06-01"), Set.of(), d("2026-07-11"));

        assertThat(r).extracting(PeriodoEstado::estado).containsExactly(EstadoPeriodo.PENDIENTE, EstadoPeriodo.PENDIENTE);
        assertThat(r.get(0).vence()).isEqualTo(d("2026-07-01"));
        assertThat(r.get(0).limite()).isEqualTo(d("2026-07-11"));
    }

    @Test
    void periodos_limiteMasUno_esImpago() {
        List<PeriodoEstado> r = MorosidadService.periodos(d("2026-06-01"), Set.of(), d("2026-07-12"));

        assertThat(r.get(0).estado()).isEqualTo(EstadoPeriodo.IMPAGO);
        assertThat(r.get(1).estado()).isEqualTo(EstadoPeriodo.PENDIENTE);
    }

    @Test
    void periodos_pagadoImpagoYAdelantado() {
        // 2026-06 pagado, 2026-07 salteado, 2026-08 pagado, 2026-09 corriente, 2026-10 adelantado pagado
        List<PeriodoEstado> r = MorosidadService.periodos(
                d("2026-06-01"), Set.of(d("2026-06-01"), d("2026-08-01"), d("2026-10-01")), d("2026-09-20"));

        assertThat(r).extracting(PeriodoEstado::estado)
                .containsExactly(EstadoPeriodo.PAGADO, EstadoPeriodo.IMPAGO, EstadoPeriodo.PAGADO, EstadoPeriodo.PENDIENTE, EstadoPeriodo.PAGADO);
        assertThat(MorosidadService.contarImpagos(d("2026-06-01"), Set.of(d("2026-06-01"), d("2026-08-01"), d("2026-10-01")), d("2026-09-20")))
                .isEqualTo(1);
    }

    @Test
    void periodos_futurosSinPagoNoSeListan() {
        assertThat(MorosidadService.periodos(d("2026-09-01"), Set.of(), d("2026-09-05")))
                .extracting(PeriodoEstado::periodo)
                .containsExactly(d("2026-09-01"));
        assertThat(MorosidadService.periodos(d("2026-11-01"), Set.of(), d("2026-09-05"))).isEmpty();
    }

    // ------------------------------------------------------------------ veredicto

    @Test
    void veredicto_alDia_noConsultaExcepciones() {
        VeredictoMorosidad v = servicio(List.of(), 6, "2026-06-20").veredicto(socio("2026-01-01"));

        assertThat(v.bloqueado()).isFalse();
        assertThat(v.excepcion()).isEmpty();
        verifyNoInteractions(excepciones);
    }

    @Test
    void veredicto_suspendidoSinExcepcion_bloquea() {
        when(excepciones.findByPersonaIdOrderByCreadoEnDesc(7L)).thenReturn(List.of());

        VeredictoMorosidad v = servicio(List.of(), 6, "2026-07-20").veredicto(socio("2026-01-01"));

        assertThat(v.deuda().suspendido()).isTrue();
        assertThat(v.bloqueado()).isTrue();
    }

    @Test
    void veredicto_suspendidoConExcepcionVigente_noBloquea_yVencidaSi() {
        ExcepcionMorosidad vencida = new ExcepcionMorosidad(7L, 1L, "vieja", d("2026-07-01"), false);
        ExcepcionMorosidad vigente = new ExcepcionMorosidad(7L, 1L, "plan de pago", d("2026-07-31"), false);
        when(excepciones.findByPersonaIdOrderByCreadoEnDesc(7L)).thenReturn(List.of(vencida, vigente));

        VeredictoMorosidad conVigente = servicio(List.of(), 6, "2026-07-20").veredicto(socio("2026-01-01"));
        assertThat(conVigente.bloqueado()).isFalse();
        assertThat(conVigente.excepcion()).contains(vigente);

        when(excepciones.findByPersonaIdOrderByCreadoEnDesc(7L)).thenReturn(List.of(vencida));
        assertThat(servicio(List.of(), 6, "2026-07-20").veredicto(socio("2026-01-01")).bloqueado()).isTrue();
    }
}
