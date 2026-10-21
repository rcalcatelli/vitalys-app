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
import java.time.OffsetDateTime;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * Mapea {@code notificaciones}. Hay UNA fila por notificación y cada reintento la actualiza. El
 * estado se deduce de ({@code exitoso}, {@code intentos}, {@code ultimoIntentoEn}): ver V13.
 */
@Entity
@Table(name = "notificaciones")
public class Notificacion {

    /** Cantidad total de intentos: el envío original más un único reintento. */
    public static final int MAX_INTENTOS = 2;

    private static final int MAX_DETALLE = 1000;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "persona_id", nullable = false)
    private Persona persona;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "turno_id")
    private Turno turno;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "tipo", columnDefinition = "tipo_notificacion", nullable = false)
    private TipoNotificacion tipo;

    @Column(name = "enviado_en", nullable = false)
    private OffsetDateTime enviadoEn;

    @Column(name = "email_destino", nullable = false)
    private String emailDestino;

    @Column(nullable = false)
    private boolean exitoso;

    @Column(name = "detalle_error", columnDefinition = "text")
    private String detalleError;

    @Column(nullable = false)
    private int intentos;

    @Column(name = "ultimo_intento_en")
    private OffsetDateTime ultimoIntentoEn;

    protected Notificacion() {
        // Requerido por JPA
    }

    private Notificacion(Persona persona, Turno turno, TipoNotificacion tipo, String emailDestino, OffsetDateTime ahora) {
        this.persona = persona;
        this.turno = turno;
        this.tipo = tipo;
        this.emailDestino = emailDestino;
        this.enviadoEn = ahora;
    }

    /** Nace "en curso": no exitosa y sin intentos, hasta que el despachador la resuelva. */
    public static Notificacion pendiente(
            Persona persona, Turno turno, TipoNotificacion tipo, String emailDestino, OffsetDateTime ahora) {
        return new Notificacion(persona, turno, tipo, emailDestino, ahora);
    }

    public void registrarExito(OffsetDateTime ahora) {
        this.intentos++;
        this.ultimoIntentoEn = ahora;
        this.exitoso = true;
        this.detalleError = null;
    }

    public void registrarFallo(OffsetDateTime ahora, String detalle) {
        this.intentos++;
        this.ultimoIntentoEn = ahora;
        this.exitoso = false;
        this.detalleError = detalle != null && detalle.length() > MAX_DETALLE ? detalle.substring(0, MAX_DETALLE) : detalle;
    }

    public boolean esDefinitiva() {
        return !exitoso && intentos >= MAX_INTENTOS;
    }

    public Long getId() {
        return id;
    }

    public Persona getPersona() {
        return persona;
    }

    public Turno getTurno() {
        return turno;
    }

    public TipoNotificacion getTipo() {
        return tipo;
    }

    public OffsetDateTime getEnviadoEn() {
        return enviadoEn;
    }

    public String getEmailDestino() {
        return emailDestino;
    }

    public boolean isExitoso() {
        return exitoso;
    }

    public String getDetalleError() {
        return detalleError;
    }

    public int getIntentos() {
        return intentos;
    }

    public OffsetDateTime getUltimoIntentoEn() {
        return ultimoIntentoEn;
    }
}
