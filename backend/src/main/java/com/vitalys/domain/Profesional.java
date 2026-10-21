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
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * Mapea la tabla {@code profesionales} (V1). La baja es lógica ({@code activo = false}): la fila
 * nunca se borra porque los turnos históricos la referencian. El profesional no tiene DNI en el
 * esquema; su identidad de acceso es el {@link Usuario} asociado.
 */
@Entity
@Table(name = "profesionales")
public class Profesional {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "usuario_id", nullable = false, unique = true, updatable = false)
    private Usuario usuario;

    @Column(nullable = false, length = 100)
    private String nombre;

    @Column(nullable = false, length = 100)
    private String apellido;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "especialidad", columnDefinition = "especialidad", nullable = false)
    private Especialidad especialidad;

    @Column(name = "duracion_turno_minutos", nullable = false)
    private int duracionTurnoMinutos;

    @Column(nullable = false)
    private boolean activo = true;

    @Column(name = "creado_en", insertable = false, updatable = false)
    private OffsetDateTime creadoEn;

    @Column(name = "actualizado_en", insertable = false, updatable = false)
    private OffsetDateTime actualizadoEn;

    protected Profesional() {
        // Requerido por JPA
    }

    public Profesional(Usuario usuario) {
        this.usuario = usuario;
        this.activo = true;
    }

    /** Baja lógica: el profesional deja de atender, pero sus turnos históricos siguen apuntándole. */
    public void darDeBaja() {
        this.activo = false;
    }

    /** Vuelve a atender; las franjas borradas en la baja no se restauran (RN-25). */
    public void reactivar() {
        this.activo = true;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Usuario getUsuario() {
        return usuario;
    }

    public String getNombre() {
        return nombre;
    }

    public void setNombre(String nombre) {
        this.nombre = nombre;
    }

    public String getApellido() {
        return apellido;
    }

    public void setApellido(String apellido) {
        this.apellido = apellido;
    }

    public Especialidad getEspecialidad() {
        return especialidad;
    }

    public void setEspecialidad(Especialidad especialidad) {
        this.especialidad = especialidad;
    }

    public int getDuracionTurnoMinutos() {
        return duracionTurnoMinutos;
    }

    public void setDuracionTurnoMinutos(int duracionTurnoMinutos) {
        this.duracionTurnoMinutos = duracionTurnoMinutos;
    }

    public boolean isActivo() {
        return activo;
    }
}
