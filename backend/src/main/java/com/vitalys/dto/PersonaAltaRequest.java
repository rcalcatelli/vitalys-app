package com.vitalys.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Body de {@code POST /api/personas}: alta presencial (RF-05). Crea el usuario con rol
 * {@code SOCIO_PACIENTE} y la persona en una sola operación.
 */
@Schema(description = "Alta presencial: credenciales nuevas más los datos de la persona.")
public record PersonaAltaRequest(
        @NotBlank @Email @Schema(example = "nuevo.socio@mail.com") String email,
        @NotBlank @Size(min = 8, message = "La contraseña debe tener al menos 8 caracteres")
                @Schema(example = "Admin1234!", minLength = 8)
                String contrasena,
        @NotNull @Valid PersonaDatosRequest datos) {}
