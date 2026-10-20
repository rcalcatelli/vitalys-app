package com.vitalys.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalTime;
import java.time.OffsetDateTime;

/**
 * Mapea {@code disponibilidad_profesional} (V1): una franja semanal recurrente. {@code dia_semana}
 * sigue {@link java.time.DayOfWeek}: 1 = lunes … 7 = domingo. La columna es SMALLINT, por eso el
 * atributo es {@code short} (con {@code ddl-auto=validate} un {@code int} no valida).
 */
@Entity
@Table(name = "disponibilidad_profesional")
public class DisponibilidadProfesional {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "profesional_id", nullable = false, updatable = false)
    private Profesional profesional;

    @Column(name = "dia_semana", nullable = false)
    private short diaSemana;

    @Column(name = "hora_inicio", nullable = false)
    private LocalTime horaInicio;

    @Column(name = "hora_fin", nullable = false)
    private LocalTime horaFin;

    @Column(nullable = false)
    private boolean activo = true;

    @Column(name = "creado_en", insertable = false, updatable = false)
    private OffsetDateTime creadoEn;

    @Column(name = "actualizado_en", insertable = false, updatable = false)
    private OffsetDateTime actualizadoEn;

    protected DisponibilidadProfesional() {
        // Requerido por JPA
    }

    public DisponibilidadProfesional(Profesional profesional, int diaSemana, LocalTime horaInicio, LocalTime horaFin) {
        this.profesional = profesional;
        this.diaSemana = (short) diaSemana;
        this.horaInicio = horaInicio;
        this.horaFin = horaFin;
        this.activo = true;
    }

    public Long getId() {
        return id;
    }

    public Profesional getProfesional() {
        return profesional;
    }

    public int getDiaSemana() {
        return diaSemana;
    }

    public void setDiaSemana(int diaSemana) {
        this.diaSemana = (short) diaSemana;
    }

    public LocalTime getHoraInicio() {
        return horaInicio;
    }

    public void setHoraInicio(LocalTime horaInicio) {
        this.horaInicio = horaInicio;
    }

    public LocalTime getHoraFin() {
        return horaFin;
    }

    public void setHoraFin(LocalTime horaFin) {
        this.horaFin = horaFin;
    }

    public boolean isActivo() {
        return activo;
    }
}
