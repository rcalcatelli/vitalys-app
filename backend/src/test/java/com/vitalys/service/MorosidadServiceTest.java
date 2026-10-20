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
import com.vitalys.service.MorosidadService.EstadoDeuda;
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
        return new MorosidadService(jdbc, clock);
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

        EstadoDeuda estado = new MorosidadService(jdbc, Clock.systemUTC()).evaluar(p);

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
}
