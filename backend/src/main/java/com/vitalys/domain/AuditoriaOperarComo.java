package com.vitalys.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * Una fila de {@code auditoria_operar_como} (V17): el inicio o el fin de una sesión de "Operar
 * como", o una escritura hecha en ella (RN-27). Solo se inserta, nunca se modifica.
 */
@Entity
@Table(name = "auditoria_operar_como")
public class AuditoriaOperarComo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "sesion_id", nullable = false, updatable = false)
    private UUID sesionId;

    @Column(name = "operador_usuario_id", nullable = false, updatable = false)
    private Long operadorUsuarioId;

    @Column(name = "sujeto_usuario_id", nullable = false, updatable = false)
    private Long sujetoUsuarioId;

    @Column(name = "persona_id", nullable = false, updatable = false)
    private Long personaId;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "accion", columnDefinition = "accion_operar_como", nullable = false, updatable = false)
    private AccionOperarComo accion;

    @Column(name = "turno_id", updatable = false)
    private Long turnoId;

    @Column(name = "ocurrido_en", nullable = false, updatable = false)
    private OffsetDateTime ocurridoEn;

    protected AuditoriaOperarComo() {
        // Requerido por JPA
    }

    public AuditoriaOperarComo(
            UUID sesionId,
            Long operadorUsuarioId,
            Long sujetoUsuarioId,
            Long personaId,
            AccionOperarComo accion,
            Long turnoId,
            OffsetDateTime ocurridoEn) {
        this.sesionId = sesionId;
        this.operadorUsuarioId = operadorUsuarioId;
        this.sujetoUsuarioId = sujetoUsuarioId;
        this.personaId = personaId;
        this.accion = accion;
        this.turnoId = turnoId;
        this.ocurridoEn = ocurridoEn;
    }

    public Long getId() {
        return id;
    }

    public UUID getSesionId() {
        return sesionId;
    }

    public Long getOperadorUsuarioId() {
        return operadorUsuarioId;
    }

    public Long getSujetoUsuarioId() {
        return sujetoUsuarioId;
    }

    public Long getPersonaId() {
        return personaId;
    }

    public AccionOperarComo getAccion() {
        return accion;
    }

    public Long getTurnoId() {
        return turnoId;
    }

    public OffsetDateTime getOcurridoEn() {
        return ocurridoEn;
    }
}
