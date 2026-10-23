package com.vitalys.dto;

import com.vitalys.domain.RolUsuario;
import io.swagger.v3.oas.annotations.media.Schema;

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

    public MeResponse(Long id, String email, RolUsuario rol, String nombre, String apellido) {
        this.id = id;
        this.email = email;
        this.rol = rol;
        this.nombre = nombre;
        this.apellido = apellido;
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
