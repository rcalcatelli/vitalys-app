package com.vitalys.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Body de {@code POST /api/profesionales}: alta (RF-11). Crea el usuario con rol
 * {@code PROFESIONAL}, con la contraseña inicial que define el ADMIN, y el profesional en una
 * sola operación.
 */
@Schema(description = "Alta de profesional: credenciales nuevas más los datos del profesional.")
public record ProfesionalAltaRequest(
        @NotBlank @Email @Schema(example = "nuevo.profesional@vitalys.com") String email,
        @NotBlank @Size(min = 8, message = "La contraseña debe tener al menos 8 caracteres")
                @Schema(example = "Admin1234!", minLength = 8)
                String contrasena,
        @NotNull @Valid ProfesionalDatosRequest datos) {}
