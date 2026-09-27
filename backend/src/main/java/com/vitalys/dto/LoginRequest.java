package com.vitalys.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

/** Body de {@code POST /api/auth/login}. */
@Schema(description = "Body de login.")
public class LoginRequest {

    @NotBlank
    @Schema(example = "socio@vitalys.test")
    private String email;

    @NotBlank
    @Schema(example = "contraseñaSegura123")
    private String contrasena;

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getContrasena() {
        return contrasena;
    }

    public void setContrasena(String contrasena) {
        this.contrasena = contrasena;
    }
}
