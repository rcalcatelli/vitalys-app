package com.vitalys.dto;

import com.fasterxml.jackson.annotation.JsonAnySetter;
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
public class RegistroRequest {

    @NotBlank
    @Email
    private String email;

    @NotBlank
    @Size(min = 8, message = "La contraseña debe tener al menos 8 caracteres")
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
