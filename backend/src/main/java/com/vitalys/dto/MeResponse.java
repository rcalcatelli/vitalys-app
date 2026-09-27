package com.vitalys.dto;

import com.vitalys.domain.RolUsuario;

/** Respuesta de {@code GET /api/auth/me}. Nunca incluye {@code password_hash}. */
public class MeResponse {

    private final Long id;
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
