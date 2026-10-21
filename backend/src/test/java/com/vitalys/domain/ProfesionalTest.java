package com.vitalys.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalTime;
import org.junit.jupiter.api.Test;

class ProfesionalTest {

    private static Profesional profesional() {
        Profesional p = new Profesional(new Usuario("prof@vitalys.com", "hash", RolUsuario.PROFESIONAL));
        p.setNombre("Florencia");
        p.setApellido("Rueda");
        p.setEspecialidad(Especialidad.KINESIOLOGIA);
        p.setDuracionTurnoMinutos(45);
        return p;
    }

    @Test
    void nuevoProfesional_nace_activo() {
        assertThat(profesional().isActivo()).isTrue();
    }

    @Test
    void darDeBaja_esLogica_yConservaLosDatos() {
        Profesional p = profesional();

        p.darDeBaja();

        assertThat(p.isActivo()).isFalse();
        assertThat(p.getApellido()).isEqualTo("Rueda");
        assertThat(p.getEspecialidad()).isEqualTo(Especialidad.KINESIOLOGIA);
        assertThat(p.getDuracionTurnoMinutos()).isEqualTo(45);
    }

    @Test
    void reactivar_vuelveAActivo_yConservaLosDatos() {
        Profesional p = profesional();
        p.darDeBaja();

        p.reactivar();

        assertThat(p.isActivo()).isTrue();
        assertThat(p.getApellido()).isEqualTo("Rueda");
    }

    @Test
    void disponibilidad_guardaLaFranjaSemanal_ySePuedeEditar() {
        Profesional p = profesional();
        DisponibilidadProfesional d = new DisponibilidadProfesional(p, 1, LocalTime.of(8, 0), LocalTime.of(12, 0));

        assertThat(d.getProfesional()).isSameAs(p);
        assertThat(d.getDiaSemana()).isEqualTo(1);
        assertThat(d.getHoraInicio()).isEqualTo(LocalTime.of(8, 0));
        assertThat(d.getHoraFin()).isEqualTo(LocalTime.of(12, 0));
        assertThat(d.isActivo()).isTrue();

        d.setDiaSemana(3);
        d.setHoraInicio(LocalTime.of(9, 0));
        d.setHoraFin(LocalTime.of(10, 0));

        assertThat(d.getDiaSemana()).isEqualTo(3);
        assertThat(d.getHoraInicio()).isEqualTo(LocalTime.of(9, 0));
        assertThat(d.getHoraFin()).isEqualTo(LocalTime.of(10, 0));
        assertThat(d.getId()).isNull();
    }
}
