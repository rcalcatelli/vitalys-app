package com.vitalys.domain;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;

class TipoFeriadoTest {

    @ParameterizedTest
    @CsvSource({
        "inamovible,INAMOVIBLE",
        "trasladable,TRASLADABLE",
        "turistico,TURISTICO",
        "no_laborable,NO_LABORABLE",
        "  INAMOVIBLE  ,INAMOVIBLE",
        "Trasladable,TRASLADABLE"
    })
    void traduce_los_valores_de_la_fuente_oficial(String valorOficial, TipoFeriado esperado) {
        assertThat(TipoFeriado.desdeValorOficial(valorOficial)).isEqualTo(esperado);
    }

    @Test
    void acepta_las_variantes_de_turistico_que_usa_la_fuente() {
        assertThat(TipoFeriado.desdeValorOficial("turístico")).isEqualTo(TipoFeriado.TURISTICO);
        assertThat(TipoFeriado.desdeValorOficial("puente")).isEqualTo(TipoFeriado.TURISTICO);
        assertThat(TipoFeriado.desdeValorOficial("no laborable")).isEqualTo(TipoFeriado.NO_LABORABLE);
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "  ", "feriadazo", "bank_holiday"})
    void devuelve_null_ante_un_valor_desconocido(String valor) {
        // Se descarta la fila en lugar de adivinar si el gimnasio cierra o no.
        assertThat(TipoFeriado.desdeValorOficial(valor)).isNull();
    }

    @Test
    void devuelve_null_ante_un_valor_ausente() {
        assertThat(TipoFeriado.desdeValorOficial(null)).isNull();
    }

    @Test
    void todos_los_tipos_cierran_el_gimnasio_menos_no_laborable() {
        assertThat(TipoFeriado.INAMOVIBLE.implicaCierre()).isTrue();
        assertThat(TipoFeriado.TRASLADABLE.implicaCierre()).isTrue();
        assertThat(TipoFeriado.TURISTICO.implicaCierre()).isTrue();

        // Las festividades religiosas rigen para quien las profesa, no para el establecimiento.
        assertThat(TipoFeriado.NO_LABORABLE.implicaCierre()).isFalse();
    }

    @Test
    void la_precedencia_resuelve_una_fecha_con_varias_festividades() {
        // El 02/04/2026 es feriado inamovible por Malvinas y además Jueves Santo y Pascua judía.
        assertThat(TipoFeriado.INAMOVIBLE.superaA(TipoFeriado.NO_LABORABLE)).isTrue();
        assertThat(TipoFeriado.NO_LABORABLE.superaA(TipoFeriado.INAMOVIBLE)).isFalse();
        assertThat(TipoFeriado.TRASLADABLE.superaA(TipoFeriado.TURISTICO)).isTrue();
    }

    @Test
    void cualquier_tipo_supera_a_la_ausencia_de_tipo() {
        assertThat(TipoFeriado.NO_LABORABLE.superaA(null)).isTrue();
    }

    @Test
    void un_tipo_no_se_supera_a_si_mismo() {
        assertThat(TipoFeriado.INAMOVIBLE.superaA(TipoFeriado.INAMOVIBLE)).isFalse();
    }
}
