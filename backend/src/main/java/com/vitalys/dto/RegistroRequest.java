package com.vitalys.dto;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Body de {@code POST /api/auth/registro}. Acepta únicamente {@code email} y {@code contraseña}
 * (RF-01, CA-01-1). Cualquier clave extra (en particular {@code rol}) se captura en
 * {@link #extras} para que {@code AuthService.registrar()} pueda detectar y rechazar un intento
 * de forzar el rol (CA-01-7) sin ignorarlo en silencio.
 */
@Schema(description = "Body de registro. No incluye \"rol\": se fuerza siempre a SOCIO_PACIENTE.")
public class RegistroRequest {

    @NotBlank
    @Email
    @Schema(example = "socio@vitalys.test")
    private String email;

    @NotBlank
    @Size(min = 8, message = "La contraseña debe tener al menos 8 caracteres")
    @Schema(example = "contraseñaSegura123", minLength = 8)
    private String contrasena;

    private final Map<String, Object> extras = new LinkedHashMap<>();

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

    @JsonAnySetter
    public void setExtra(String key, Object value) {
        extras.put(key, value);
    }

    public boolean tieneCampoRol() {
        return extras.containsKey("rol");
    }
}
