package com.vitalys.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.time.OffsetDateTime;

/**
 * Mapea {@code excepciones_morosidad} (V3 + {@code un_solo_uso} de V11). {@code turno_id} no es
 * un dato de alta: registra qué turno consumió la excepción (RN-23).
 */
@Entity
@Table(name = "excepciones_morosidad")
public class ExcepcionMorosidad {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "persona_id", nullable = false)
    private Long personaId;

    @Column(name = "autorizado_por", nullable = false)
    private Long autorizadoPor;

    @Column(name = "turno_id")
    private Long turnoId;

    @Column(nullable = false, columnDefinition = "text")
    private String motivo;

    @Column(name = "valida_hasta", nullable = false)
    private LocalDate validaHasta;

    @Column(name = "un_solo_uso", nullable = false)
    private boolean unSoloUso;

    @Column(name = "creado_en", insertable = false, updatable = false)
    private OffsetDateTime creadoEn;

    protected ExcepcionMorosidad() {
        // Requerido por JPA
    }

    public ExcepcionMorosidad(Long personaId, Long autorizadoPor, String motivo, LocalDate validaHasta, boolean unSoloUso) {
        this.personaId = personaId;
        this.autorizadoPor = autorizadoPor;
        this.motivo = motivo;
        this.validaHasta = validaHasta;
        this.unSoloUso = unSoloUso;
    }

    /** {@code valida_hasta >= hoy AND (NOT un_solo_uso OR turno_id IS NULL)}. */
    public boolean vigenteEl(LocalDate hoy) {
        return !validaHasta.isBefore(hoy) && (!unSoloUso || turnoId == null);
    }

    /** Una excepción de un solo uso se agota al registrar el turno que la usó. */
    public void consumirEn(Long turnoId) {
        if (unSoloUso) {
            this.turnoId = turnoId;
        }
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getPersonaId() {
        return personaId;
    }

    public Long getAutorizadoPor() {
        return autorizadoPor;
    }

    public Long getTurnoId() {
        return turnoId;
    }

    public String getMotivo() {
        return motivo;
    }

    public LocalDate getValidaHasta() {
        return validaHasta;
    }

    public boolean isUnSoloUso() {
        return unSoloUso;
    }

    public OffsetDateTime getCreadoEn() {
        return creadoEn;
    }
}
