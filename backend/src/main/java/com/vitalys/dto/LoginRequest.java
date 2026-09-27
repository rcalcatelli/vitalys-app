package com.vitalys.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

/**
 * Body de {@code POST /api/auth/login}. El campo {@code identificador} acepta email o DNI
 * (RF-36): si contiene {@code @} se busca por email, si no por el DNI cargado en {@code personas}
 * (ver {@code AuthService#login}). El login por DNI solo resuelve para quien ya tiene ficha en
 * {@code personas} — un usuario recién autorregistrado o un PROFESIONAL no tienen esa fila y
 * deben ingresar con email.
 */
@Schema(description = "Body de login. \"identificador\" acepta email o DNI.")
public class LoginRequest {

    @NotBlank
    @Schema(
            description = "Email o DNI de la persona.",
            example = "socio@vitalys.test",
            examples = {"socio@vitalys.test", "30111222"})
    private String identificador;

    @NotBlank
    @Schema(example = "contraseñaSegura123")
    private String contrasena;

    public String getIdentificador() {
        return identificador;
    }

    public void setIdentificador(String identificador) {
        this.identificador = identificador;
    }

    public String getContrasena() {
        return contrasena;
    }

    public void setContrasena(String contrasena) {
        this.contrasena = contrasena;
    }
}
