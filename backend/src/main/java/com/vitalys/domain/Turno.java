package com.vitalys.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Duration;
import java.time.OffsetDateTime;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * Mapea {@code turnos}. El profesional se guarda como id: la entidad {@code Profesional} es del
 * Módulo 3 y el turno de gimnasio no lo tiene ({@code chk_gym_sin_profesional}).
 */
@Entity
@Table(name = "turnos")
public class Turno {

    /** Anticipación mínima para que la cancelación quede en tiempo (RN-02). */
    public static final Duration ANTICIPACION_CONSULTORIO = Duration.ofHours(24);

    public static final Duration ANTICIPACION_GYM = Duration.ofHours(2);

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "persona_id", nullable = false)
    private Persona persona;

    @Column(name = "profesional_id")
    private Long profesionalId;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "tipo_turno", columnDefinition = "tipo_turno", nullable = false)
    private TipoTurno tipoTurno;

    @Column(name = "reservado_por_usuario_id", nullable = false)
    private Long reservadoPorUsuarioId;

    @Column(nullable = false)
    private OffsetDateTime inicio;

    @Column(nullable = false)
    private OffsetDateTime fin;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "estado", columnDefinition = "estado_turno", nullable = false)
    private EstadoTurno estado = EstadoTurno.RESERVADO;

    @Column(name = "cancelado_en")
    private OffsetDateTime canceladoEn;

    @Column(name = "cancelado_por_usuario")
    private Long canceladoPorUsuarioId;

    @Column(name = "motivo_cancelacion", columnDefinition = "text")
    private String motivoCancelacion;

    @Column(name = "completado_en")
    private OffsetDateTime completadoEn;

    @Column(name = "creado_en", insertable = false, updatable = false)
    private OffsetDateTime creadoEn;

    protected Turno() {
        // Requerido por JPA
    }

    private Turno(Persona persona, TipoTurno tipo, Long profesionalId, Long reservadoPor, OffsetDateTime inicio, OffsetDateTime fin) {
        this.persona = persona;
        this.tipoTurno = tipo;
        this.profesionalId = profesionalId;
        this.reservadoPorUsuarioId = reservadoPor;
        this.inicio = inicio;
        this.fin = fin;
    }

    /** Franja de gimnasio: 60 minutos, sin profesional. La grilla la valida el motor. */
    public static Turno deGimnasio(Persona persona, Long reservadoPor, OffsetDateTime inicio) {
        return new Turno(persona, TipoTurno.GYM, null, reservadoPor, inicio, inicio.plusHours(1));
    }

    /** Turno con un profesional; la duración sale de {@code profesionales.duracion_turno_minutos}. */
    public static Turno deConsultorio(
            Persona persona, Long profesionalId, Long reservadoPor, OffsetDateTime inicio, OffsetDateTime fin) {
        return new Turno(persona, TipoTurno.CONSULTORIO, profesionalId, reservadoPor, inicio, fin);
    }

    public Duration anticipacionRequerida() {
        return tipoTurno == TipoTurno.GYM ? ANTICIPACION_GYM : ANTICIPACION_CONSULTORIO;
    }

    /**
     * RN-02: la anticipación del aviso decide el estado (en tiempo o tarde); si el lugar se
     * libera lo decide el motor según {@code cancelado_en} contra {@code inicio}.
     */
    public void cancelar(OffsetDateTime ahora, Long usuarioId, String motivo) {
        boolean enTiempo = !Duration.between(ahora, inicio).minus(anticipacionRequerida()).isNegative();
        this.estado = enTiempo ? EstadoTurno.CANCELADO_EN_TIEMPO : EstadoTurno.CANCELADO_TARDE;
        this.canceladoEn = ahora;
        this.canceladoPorUsuarioId = usuarioId;
        this.motivoCancelacion = motivo;
    }

    /**
     * RN-24: el profesional dejó de cubrir este horario. Estado propio (no CANCELADO_*), para no
     * atribuirle al paciente una cancelación que no hizo. {@code cancelado_en} anterior al inicio
     * libera el lugar ({@code fn_turno_ocupa_lugar}); {@code chk_cancelacion_info} exige los tres datos.
     */
    public void cancelarPorProfesional(OffsetDateTime ahora, Long usuarioId, String motivo) {
        this.estado = EstadoTurno.CANCELADO_POR_PROFESIONAL;
        this.canceladoEn = ahora;
        this.canceladoPorUsuarioId = usuarioId;
        this.motivoCancelacion = motivo;
    }

    /** RN-28: el check-in deja constancia del momento ({@code chk_turno_completado_en}). */
    public void completar(OffsetDateTime ahora) {
        this.estado = EstadoTurno.COMPLETADO;
        this.completadoEn = ahora;
    }

    public void marcar(EstadoTurno nuevo) {
        this.estado = nuevo;
    }

    public boolean estaReservado() {
        return estado == EstadoTurno.RESERVADO;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Persona getPersona() {
        return persona;
    }

    public Long getProfesionalId() {
        return profesionalId;
    }

    public TipoTurno getTipoTurno() {
        return tipoTurno;
    }

    public Long getReservadoPorUsuarioId() {
        return reservadoPorUsuarioId;
    }

    public OffsetDateTime getInicio() {
        return inicio;
    }

    public OffsetDateTime getFin() {
        return fin;
    }

    public EstadoTurno getEstado() {
        return estado;
    }

    public OffsetDateTime getCanceladoEn() {
        return canceladoEn;
    }

    public Long getCanceladoPorUsuarioId() {
        return canceladoPorUsuarioId;
    }

    public String getMotivoCancelacion() {
        return motivoCancelacion;
    }

    public OffsetDateTime getCompletadoEn() {
        return completadoEn;
    }

    /** Momento en que se reservó (lo completa la base). */
    public OffsetDateTime getCreadoEn() {
        return creadoEn;
    }
}
