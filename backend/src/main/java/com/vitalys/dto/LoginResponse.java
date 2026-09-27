package com.vitalys.dto;

import com.vitalys.domain.RolUsuario;
import io.swagger.v3.oas.annotations.media.Schema;

/** Respuesta común de {@code /api/auth/registro} (201) y {@code /api/auth/login} (200). */
@Schema(description = "Respuesta común de registro y login.")
public class LoginResponse {

    @Schema(example = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJzb2Npb0B2aXRhbHlzLnRlc3QifQ.abc123")
    private final String token;

    @Schema(example = "1")
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
