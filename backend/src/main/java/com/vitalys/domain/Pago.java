package com.vitalys.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * Mapea {@code pagos} (V1 + {@code medio} de V14). Las referencias son {@code Long} sin
 * {@code @ManyToOne}, como {@link ExcepcionMorosidad}: la coherencia concepto/periodo/turno la
 * decide el motor (CHECK y trigger), y con relaciones Hibernate podría normalizar o fallar antes.
 */
@Entity
@Table(name = "pagos")
public class Pago {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "persona_id", nullable = false)
    private Long personaId;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "concepto", columnDefinition = "concepto_pago", nullable = false)
    private ConceptoPago concepto;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal monto;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "medio", columnDefinition = "medio_pago", nullable = false)
    private MedioPago medio;

    private LocalDate periodo;

    @Column(name = "turno_id")
    private Long turnoId;

    @Column(name = "registrado_por_usuario", nullable = false)
    private Long registradoPorUsuario;

    @Column(name = "fecha_pago", nullable = false)
    private OffsetDateTime fechaPago;

    @Column(name = "creado_en", insertable = false, updatable = false)
    private OffsetDateTime creadoEn;

    protected Pago() {
        // Requerido por JPA
    }

    public Pago(
            Long personaId,
            ConceptoPago concepto,
            BigDecimal monto,
            MedioPago medio,
            LocalDate periodo,
            Long turnoId,
            Long registradoPorUsuario,
            OffsetDateTime fechaPago) {
        this.personaId = personaId;
        this.concepto = concepto;
        this.monto = monto;
        this.medio = medio;
        this.periodo = periodo;
        this.turnoId = turnoId;
        this.registradoPorUsuario = registradoPorUsuario;
        this.fechaPago = fechaPago;
    }

    public Long getId() {
        return id;
    }

    public Long getPersonaId() {
        return personaId;
    }

    public ConceptoPago getConcepto() {
        return concepto;
    }

    public BigDecimal getMonto() {
        return monto;
    }

    public MedioPago getMedio() {
        return medio;
    }

    public LocalDate getPeriodo() {
        return periodo;
    }

    public Long getTurnoId() {
        return turnoId;
    }

    public Long getRegistradoPorUsuario() {
        return registradoPorUsuario;
    }

    public OffsetDateTime getFechaPago() {
        return fechaPago;
    }

    public OffsetDateTime getCreadoEn() {
        return creadoEn;
    }
}
