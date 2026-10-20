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
import java.time.LocalDate;
import java.time.OffsetDateTime;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * Mapea la tabla {@code personas} (V1 + {@code fecha_inicio_membresia} de V4). Las bajas son
 * lógicas: {@link #darDeBaja(LocalDate)} y {@link #reactivar()} mantienen el par
 * {@code estado}/{@code fecha_baja} que exige {@code chk_fecha_baja}.
 */
@Entity
@Table(name = "personas")
public class Persona {

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

    @Column(nullable = false, unique = true, length = 20)
    private String dni;

    @Column(length = 30)
    private String telefono;

    @Column(name = "fecha_nacimiento")
    private LocalDate fechaNacimiento;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "estado", columnDefinition = "estado_persona", nullable = false)
    private EstadoPersona estado = EstadoPersona.ACTIVO;

    @Column(name = "es_socio_gym", nullable = false)
    private boolean esSocioGym;

    @Column(name = "fecha_inicio_membresia")
    private LocalDate fechaInicioMembresia;

    @Column(name = "fecha_alta", nullable = false, updatable = false)
    private LocalDate fechaAlta;

    @Column(name = "fecha_baja")
    private LocalDate fechaBaja;

    @Column(name = "creado_en", insertable = false, updatable = false)
    private OffsetDateTime creadoEn;

    @Column(name = "actualizado_en", insertable = false, updatable = false)
    private OffsetDateTime actualizadoEn;

    protected Persona() {
        // Requerido por JPA
    }

    public Persona(Usuario usuario, LocalDate fechaAlta) {
        this.usuario = usuario;
        this.fechaAlta = fechaAlta;
        this.estado = EstadoPersona.ACTIVO;
    }

    public boolean estaActiva() {
        return estado == EstadoPersona.ACTIVO;
    }

    /** Baja lógica: nunca se borra la fila, para preservar el historial de turnos y pagos. */
    public void darDeBaja(LocalDate fecha) {
        this.estado = EstadoPersona.INACTIVO;
        this.fechaBaja = fecha;
    }

    public void reactivar() {
        this.estado = EstadoPersona.ACTIVO;
        this.fechaBaja = null;
    }

    /**
     * {@code chk_fecha_inicio_membresia}: la fecha existe si y solo si es socio del gimnasio.
     * Quien deja de ser socio pierde la fecha; quien vuelve a serlo trae una nueva.
     */
    public void definirMembresiaGym(boolean esSocioGym, LocalDate fechaInicioMembresia) {
        this.esSocioGym = esSocioGym;
        this.fechaInicioMembresia = esSocioGym ? fechaInicioMembresia : null;
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

    public String getDni() {
        return dni;
    }

    public void setDni(String dni) {
        this.dni = dni;
    }

    public String getTelefono() {
        return telefono;
    }

    public void setTelefono(String telefono) {
        this.telefono = telefono;
    }

    public LocalDate getFechaNacimiento() {
        return fechaNacimiento;
    }

    public void setFechaNacimiento(LocalDate fechaNacimiento) {
        this.fechaNacimiento = fechaNacimiento;
    }

    public EstadoPersona getEstado() {
        return estado;
    }

    public boolean isEsSocioGym() {
        return esSocioGym;
    }

    public LocalDate getFechaInicioMembresia() {
        return fechaInicioMembresia;
    }

    public LocalDate getFechaAlta() {
        return fechaAlta;
    }

    public LocalDate getFechaBaja() {
        return fechaBaja;
    }
}
