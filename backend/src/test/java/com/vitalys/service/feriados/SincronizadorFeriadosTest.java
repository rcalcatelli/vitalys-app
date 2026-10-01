package com.vitalys.service.feriados;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.vitalys.config.FeriadosProperties;
import com.vitalys.domain.Feriado;
import com.vitalys.domain.OrigenFeriado;
import com.vitalys.domain.TipoFeriado;
import com.vitalys.repository.FeriadoRepository;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

/**
 * Casos del sincronizador de feriados (RF-38) contra un doble del cliente: nunca sale a internet.
 */
class SincronizadorFeriadosTest {

    private static final int ANIO = 2026;

    private FeriadosOficialesClient client;
    private FeriadoRepository repositorio;
    private SincronizadorFeriados sincronizador;

    @BeforeEach
    void setUp() {
        client = mock(FeriadosOficialesClient.class);
        repositorio = mock(FeriadoRepository.class);

        FeriadosProperties propiedades = new FeriadosProperties();
        propiedades.setAniosASincronizar(1);

        sincronizador = new SincronizadorFeriados(client, repositorio, propiedades);

        // Por defecto no hay nada cargado ni fechas ocupadas por filas manuales.
        when(repositorio.findPorOrigenEntreFechas(any(), any(), any())).thenReturn(List.of());
        when(repositorio.existsById(any())).thenReturn(false);
    }

    private FeriadoOficial oficial(String fecha, String nombre, TipoFeriado tipo) {
        return new FeriadoOficial(LocalDate.parse(fecha), nombre, tipo);
    }

    private Feriado yaCargado(String fecha, String nombre, TipoFeriado tipo) {
        return Feriado.oficial(LocalDate.parse(fecha), nombre, tipo, OffsetDateTime.now().minusDays(2));
    }

    @Test
    void da_de_alta_un_feriado_nuevo_y_marca_que_cierra_el_gimnasio() {
        when(client.obtenerAnio(ANIO))
                .thenReturn(List.of(oficial("2026-12-25", "Navidad", TipoFeriado.INAMOVIBLE)));

        ResultadoSincronizacion resultado = sincronizador.sincronizarAnio(ANIO);

        ArgumentCaptor<Feriado> guardado = ArgumentCaptor.forClass(Feriado.class);
        verify(repositorio).save(guardado.capture());

        assertThat(guardado.getValue().getFecha()).isEqualTo(LocalDate.of(2026, 12, 25));
        assertThat(guardado.getValue().getDescripcion()).isEqualTo("Navidad");
        assertThat(guardado.getValue().getOrigen()).isEqualTo(OrigenFeriado.OFICIAL);
        assertThat(guardado.getValue().isCierraGimnasio()).isTrue();
        assertThat(guardado.getValue().getSincronizadoEn()).isNotNull();
        assertThat(resultado.altas()).isEqualTo(1);
        assertThat(resultado.huboCambios()).isTrue();
    }

    @Test
    void un_dia_no_laborable_no_cierra_el_gimnasio() {
        when(client.obtenerAnio(ANIO))
                .thenReturn(List.of(oficial("2026-09-21", "Día del Perdón", TipoFeriado.NO_LABORABLE)));

        sincronizador.sincronizarAnio(ANIO);

        ArgumentCaptor<Feriado> guardado = ArgumentCaptor.forClass(Feriado.class);
        verify(repositorio).save(guardado.capture());
        assertThat(guardado.getValue().isCierraGimnasio()).isFalse();
    }

    @Test
    void cuando_la_fuente_lista_varias_festividades_el_mismo_dia_gana_la_de_mayor_peso() {
        // 02/04/2026: Malvinas (inamovible) + Jueves Santo y Pascua judía (no laborables).
        when(client.obtenerAnio(ANIO))
                .thenReturn(
                        List.of(
                                oficial("2026-04-02", "Jueves Santo", TipoFeriado.NO_LABORABLE),
                                oficial("2026-04-02", "Malvinas", TipoFeriado.INAMOVIBLE),
                                oficial("2026-04-02", "Pascua Judía", TipoFeriado.NO_LABORABLE)));

        ResultadoSincronizacion resultado = sincronizador.sincronizarAnio(ANIO);

        ArgumentCaptor<Feriado> guardado = ArgumentCaptor.forClass(Feriado.class);
        verify(repositorio).save(guardado.capture());

        assertThat(guardado.getAllValues()).hasSize(1);
        assertThat(guardado.getValue().getDescripcion()).isEqualTo("Malvinas");
        assertThat(guardado.getValue().isCierraGimnasio()).isTrue();
        assertThat(resultado.altas()).isEqualTo(1);
    }

    @Test
    void actualiza_un_feriado_que_cambio_de_nombre() {
        when(repositorio.findPorOrigenEntreFechas(any(), any(), any()))
                .thenReturn(new ArrayList<>(List.of(yaCargado("2026-11-09", "Feriado", TipoFeriado.INAMOVIBLE))));
        when(client.obtenerAnio(ANIO))
                .thenReturn(
                        List.of(oficial("2026-11-09", "Visita de Su Santidad el Papa León XIV", TipoFeriado.INAMOVIBLE)));

        ResultadoSincronizacion resultado = sincronizador.sincronizarAnio(ANIO);

        assertThat(resultado.modificaciones()).isEqualTo(1);
        assertThat(resultado.altas()).isZero();
    }

    @Test
    void no_cuenta_como_cambio_lo_que_ya_estaba_igual() {
        when(repositorio.findPorOrigenEntreFechas(any(), any(), any()))
                .thenReturn(new ArrayList<>(List.of(yaCargado("2026-12-25", "Navidad", TipoFeriado.INAMOVIBLE))));
        when(client.obtenerAnio(ANIO))
                .thenReturn(List.of(oficial("2026-12-25", "Navidad", TipoFeriado.INAMOVIBLE)));

        ResultadoSincronizacion resultado = sincronizador.sincronizarAnio(ANIO);

        assertThat(resultado.sinCambios()).isEqualTo(1);
        assertThat(resultado.huboCambios()).isFalse();
    }

    @Test
    void da_de_baja_un_feriado_que_la_fuente_ya_no_lista() {
        // Un trasladable que se corrió de fecha: baja en la vieja, alta en la nueva.
        Feriado viejo = yaCargado("2026-11-20", "Soberanía Nacional", TipoFeriado.TRASLADABLE);
        when(repositorio.findPorOrigenEntreFechas(any(), any(), any()))
                .thenReturn(new ArrayList<>(List.of(viejo)));
        when(client.obtenerAnio(ANIO))
                .thenReturn(List.of(oficial("2026-11-23", "Soberanía Nacional (20/11)", TipoFeriado.TRASLADABLE)));

        ResultadoSincronizacion resultado = sincronizador.sincronizarAnio(ANIO);

        verify(repositorio).delete(viejo);
        assertThat(resultado.bajas()).isEqualTo(1);
        assertThat(resultado.altas()).isEqualTo(1);
    }

    @Test
    void no_pisa_una_fecha_que_el_admin_cargo_a_mano() {
        // findPorOrigenEntreFechas(OFICIAL, ...) no la devuelve, pero la fecha ya está ocupada.
        when(repositorio.existsById(LocalDate.of(2026, 11, 2))).thenReturn(true);
        when(client.obtenerAnio(ANIO))
                .thenReturn(List.of(oficial("2026-11-02", "Feriado nacional", TipoFeriado.INAMOVIBLE)));

        ResultadoSincronizacion resultado = sincronizador.sincronizarAnio(ANIO);

        verify(repositorio, never()).save(any());
        assertThat(resultado.altas()).isZero();
    }

    @Test
    void una_correccion_manual_de_cierra_gimnasio_sobrevive_si_el_tipo_no_cambio() {
        Feriado existente = yaCargado("2026-12-07", "Puente turístico", TipoFeriado.TURISTICO);
        existente.setCierraGimnasio(false); // el ADMIN decidió abrir igual ese día
        when(repositorio.findPorOrigenEntreFechas(any(), any(), any()))
                .thenReturn(new ArrayList<>(List.of(existente)));
        when(client.obtenerAnio(ANIO))
                .thenReturn(List.of(oficial("2026-12-07", "Puente turístico", TipoFeriado.TURISTICO)));

        sincronizador.sincronizarAnio(ANIO);

        assertThat(existente.isCierraGimnasio()).isFalse();
    }

    @Test
    void si_el_estado_reclasifica_el_dia_manda_la_fuente() {
        Feriado existente = yaCargado("2026-06-17", "Año Nuevo Islámico", TipoFeriado.NO_LABORABLE);
        assertThat(existente.isCierraGimnasio()).isFalse();
        when(repositorio.findPorOrigenEntreFechas(any(), any(), any()))
                .thenReturn(new ArrayList<>(List.of(existente)));
        when(client.obtenerAnio(ANIO))
                .thenReturn(List.of(oficial("2026-06-17", "Feriado por decreto", TipoFeriado.INAMOVIBLE)));

        sincronizador.sincronizarAnio(ANIO);

        assertThat(existente.isCierraGimnasio()).isTrue();
        assertThat(existente.getTipo()).isEqualTo(TipoFeriado.INAMOVIBLE);
    }

    @Test
    void si_la_fuente_falla_el_calendario_queda_intacto() {
        when(client.obtenerAnio(anyInt()))
                .thenThrow(new FeriadosNoDisponiblesException("timeout contra la fuente"));

        ResultadoSincronizacion resultado = sincronizador.sincronizarAnios(List.of(ANIO));

        // Lo importante: no se borró ni se guardó nada. Vaciar el calendario por una caída
        // abriría el gimnasio un feriado.
        verify(repositorio, never()).delete(any());
        verify(repositorio, never()).save(any());
        assertThat(resultado.exitoso()).isFalse();
        assertThat(resultado.errores()).hasSize(1);
        assertThat(resultado.errores().get(0)).contains("2026");
    }

    @Test
    void un_anio_que_falla_no_impide_sincronizar_los_demas() {
        when(client.obtenerAnio(2026))
                .thenReturn(List.of(oficial("2026-12-25", "Navidad", TipoFeriado.INAMOVIBLE)));
        when(client.obtenerAnio(2027))
                .thenThrow(new FeriadosNoDisponiblesException("404 en la fuente"));

        ResultadoSincronizacion resultado = sincronizador.sincronizarAnios(List.of(2026, 2027));

        assertThat(resultado.altas()).isEqualTo(1);
        assertThat(resultado.errores()).hasSize(1);
        assertThat(resultado.exitoso()).isFalse();
        assertThat(resultado.resumen()).contains("altas=1");
    }

    @Test
    void sincronizar_cubre_el_anio_en_curso_y_los_siguientes() {
        FeriadosProperties propiedades = new FeriadosProperties();
        propiedades.setAniosASincronizar(2);
        SincronizadorFeriados conDosAnios =
                new SincronizadorFeriados(client, repositorio, propiedades);

        int anioActual = LocalDate.now(java.time.ZoneId.of(propiedades.getZona())).getYear();
        when(client.obtenerAnio(anyInt())).thenReturn(List.of());

        ResultadoSincronizacion resultado = conDosAnios.sincronizar();

        assertThat(resultado.anios()).containsExactly(anioActual, anioActual + 1);
        verify(client).obtenerAnio(anioActual);
        verify(client).obtenerAnio(anioActual + 1);
    }
}
