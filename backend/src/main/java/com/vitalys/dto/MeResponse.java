package com.vitalys.dto;

import com.vitalys.domain.RolUsuario;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.OffsetDateTime;

/** Respuesta de {@code GET /api/auth/me}. Nunca incluye {@code password_hash}. */
@Schema(description = "Datos del usuario autenticado. Nunca incluye password_hash.")
public class MeResponse {

    @Schema(example = "1")
    private final Long id;

    @Schema(example = "socio@vitalys.test")
    private final String email;

    private final RolUsuario rol;

    @Schema(description = "Nombre de pila de la ficha (persona o profesional); null si el usuario no tiene ficha.", example = "Laura")
    private final String nombre;

    @Schema(description = "Apellido de la ficha; null si el usuario no tiene ficha.", example = "Benítez")
    private final String apellido;

    @Schema(description = "ADMIN que opera en nombre de este socio (RF-39); null fuera de una sesión de Operar como.")
    private final Operador operadoPor;

    @Schema(description = "Vencimiento de la credencial de Operar como; null fuera de esa sesión.")
    private final OffsetDateTime operarComoExpiraEn;

    /** El ADMIN detrás de una sesión de "Operar como". Solo lo ve quien tiene esa credencial: el propio ADMIN. */
    public record Operador(Long usuarioId, String nombre, String apellido) {}

    public MeResponse(Long id, String email, RolUsuario rol, String nombre, String apellido) {
        this(id, email, rol, nombre, apellido, null, null);
    }

    public MeResponse(
            Long id,
            String email,
            RolUsuario rol,
            String nombre,
            String apellido,
            Operador operadoPor,
            OffsetDateTime operarComoExpiraEn) {
        this.id = id;
        this.email = email;
        this.rol = rol;
        this.nombre = nombre;
        this.apellido = apellido;
        this.operadoPor = operadoPor;
        this.operarComoExpiraEn = operarComoExpiraEn;
    }

    public Operador getOperadoPor() {
        return operadoPor;
    }

    public OffsetDateTime getOperarComoExpiraEn() {
        return operarComoExpiraEn;
    }

    public String getNombre() {
        return nombre;
    }

    public String getApellido() {
        return apellido;
    }

    public Long getId() {
        return id;
    }

    public String getEmail() {
        return email;
    }

    public RolUsuario getRol() {
        return rol;
    }
}
