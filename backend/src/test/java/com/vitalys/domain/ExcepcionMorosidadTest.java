package com.vitalys.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import org.junit.jupiter.api.Test;

class ExcepcionMorosidadTest {

    private static final LocalDate HOY = LocalDate.of(2026, 10, 20);

    @Test
    void vigenteHastaSuUltimoDiaInclusive() {
        ExcepcionMorosidad e = new ExcepcionMorosidad(1L, 9L, "plan de pago", HOY, false);
        assertThat(e.vigenteEl(HOY)).isTrue();
        assertThat(e.vigenteEl(HOY.plusDays(1))).isFalse();
    }

    @Test
    void deUnSoloUso_seAgotaAlConsumirse() {
        ExcepcionMorosidad e = new ExcepcionMorosidad(1L, 9L, "plan de pago", HOY.plusDays(5), true);
        e.consumirEn(33L);
        assertThat(e.getTurnoId()).isEqualTo(33L);
        assertThat(e.vigenteEl(HOY)).isFalse();
    }

    @Test
    void porPeriodo_noSeAgotaNiRegistraTurno() {
        ExcepcionMorosidad e = new ExcepcionMorosidad(1L, 9L, "plan de pago", HOY.plusDays(5), false);
        e.consumirEn(33L);
        assertThat(e.getTurnoId()).isNull();
        assertThat(e.vigenteEl(HOY)).isTrue();
    }
}
