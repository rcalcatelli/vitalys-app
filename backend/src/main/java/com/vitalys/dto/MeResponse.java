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

    public MeResponse(Long id, String email, RolUsuario rol) {
        this.id = id;
        this.email = email;
        this.rol = rol;
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
