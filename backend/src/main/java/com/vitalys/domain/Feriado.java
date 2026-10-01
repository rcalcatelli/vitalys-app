package com.vitalys.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Enumerated;
import jakarta.persistence.EnumType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * Mapea la tabla {@code feriados} de {@code db/migration/V10__feriados_gimnasio.sql}: el
 * calendario de días en que el gimnasio no abre (RN-14).
 *
 * <p>La clave primaria es la fecha, no un id sintético: hay a lo sumo una fila por día. Cuando la
 * fuente oficial lista varias festividades el mismo día, el sincronizador conserva la de mayor
 * peso ({@link TipoFeriado#superaA}).
 *
 * <p>Los enums se mapean con {@link SqlTypes#NAMED_ENUM} porque en Postgres son tipos nativos
 * ({@code tipo_feriado}, {@code origen_feriado}). Un {@code @Enumerated(STRING)} a secas falla al
 * insertar: Hibernate manda un {@code varchar} y el motor no lo castea solo.
 */
@Entity
@Table(name = "feriados")
public class Feriado {

    @Id
    @Column(name = "fecha", nullable = false)
    private LocalDate fecha;

    @Column(name = "descripcion", nullable = false, length = 200)
    private String descripcion;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "tipo", columnDefinition = "tipo_feriado", nullable = false)
    private TipoFeriado tipo;

    /**
     * Si el gimnasio no abre ese día. Es una columna y no algo derivado de {@link #tipo} para que
     * el ADMIN pueda corregir un caso puntual sin pelear con la clasificación oficial. El
     * sincronizador la recalcula solo cuando el tipo cambia, de modo que una corrección manual
     * sobrevive a las sincronizaciones siguientes.
     */
    @Column(name = "cierra_gimnasio", nullable = false)
    private boolean cierraGimnasio;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "origen", columnDefinition = "origen_feriado", nullable = false)
    private OrigenFeriado origen = OrigenFeriado.OFICIAL;

    /** Última sincronización con la fuente oficial. {@code null} en las filas manuales. */
    @Column(name = "sincronizado_en")
    private OffsetDateTime sincronizadoEn;

    @Column(name = "creado_en", insertable = false, updatable = false)
    private OffsetDateTime creadoEn;

    @Column(name = "actualizado_en", insertable = false, updatable = false)
    private OffsetDateTime actualizadoEn;

    protected Feriado() {
        // requerido por JPA
    }

    private Feriado(
            LocalDate fecha,
            String descripcion,
            TipoFeriado tipo,
            boolean cierraGimnasio,
            OrigenFeriado origen,
            OffsetDateTime sincronizadoEn) {
        this.fecha = fecha;
        this.descripcion = descripcion;
        this.tipo = tipo;
        this.cierraGimnasio = cierraGimnasio;
        this.origen = origen;
        this.sincronizadoEn = sincronizadoEn;
    }

    /** Fila importada del dataset oficial. El cierre se deduce del tipo. */
    public static Feriado oficial(
            LocalDate fecha, String descripcion, TipoFeriado tipo, OffsetDateTime sincronizadoEn) {
        return new Feriado(
                fecha,
                descripcion,
                tipo,
                tipo.implicaCierre(),
                OrigenFeriado.OFICIAL,
                sincronizadoEn);
    }

    /** Fila cargada por el ADMIN: un feriado provincial o un cierre propio del centro. */
    public static Feriado manual(
            LocalDate fecha, String descripcion, TipoFeriado tipo, boolean cierraGimnasio) {
        return new Feriado(fecha, descripcion, tipo, cierraGimnasio, OrigenFeriado.MANUAL, null);
    }

    /**
     * Aplica los datos que vinieron de la fuente oficial sobre una fila ya existente.
     *
     * <p>{@code cierraGimnasio} se recalcula <strong>solo si cambió el tipo</strong>. Si el ADMIN
     * corrigió esa bandera a mano y el Estado no cambió la clasificación, la corrección se
     * respeta; si el Estado reclasificó el día, manda la fuente.
     */
    public void actualizarDesdeOficial(
            String descripcion, TipoFeriado tipo, OffsetDateTime sincronizadoEn) {
        if (this.tipo != tipo) {
            this.cierraGimnasio = tipo.implicaCierre();
        }
        this.descripcion = descripcion;
        this.tipo = tipo;
        this.origen = OrigenFeriado.OFICIAL;
        this.sincronizadoEn = sincronizadoEn;
    }

    public LocalDate getFecha() {
        return fecha;
    }

    public String getDescripcion() {
        return descripcion;
    }

    public TipoFeriado getTipo() {
        return tipo;
    }

    public boolean isCierraGimnasio() {
        return cierraGimnasio;
    }

    public void setCierraGimnasio(boolean cierraGimnasio) {
        this.cierraGimnasio = cierraGimnasio;
    }

    public OrigenFeriado getOrigen() {
        return origen;
    }

    public OffsetDateTime getSincronizadoEn() {
        return sincronizadoEn;
    }

    public OffsetDateTime getCreadoEn() {
        return creadoEn;
    }

    public OffsetDateTime getActualizadoEn() {
        return actualizadoEn;
    }
}
