package com.vitalys.dto;

import jakarta.validation.constraints.NotBlank;

/** Body de {@code POST /api/auth/login}. */
public class LoginRequest {

    @NotBlank
    private String email;

    @NotBlank
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
