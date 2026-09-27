package com.vitalys.dto;

import com.vitalys.domain.RolUsuario;

/** Respuesta común de {@code /api/auth/registro} (201) y {@code /api/auth/login} (200). */
public class LoginResponse {

    private final String token;
    private final Long usuarioId;
    private final RolUsuario rol;

    public LoginResponse(String token, Long usuarioId, RolUsuario rol) {
        this.token = token;
        this.usuarioId = usuarioId;
        this.rol = rol;
    }

    public String getToken() {
        return token;
    }

    public Long getUsuarioId() {
        return usuarioId;
    }

    public RolUsuario getRol() {
        return rol;
    }
}
