package com.vitalys.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * Body de {@code POST /api/personas/vincular} (RF-31). Sin contraseña: el usuario ya tiene la
 * suya (CA-07-3). Si el cliente manda {@code contrasena} igual, se rechaza en vez de ignorarla en
 * silencio, para que nadie crea que la cambió.
 */
@Schema(description = "Vínculo de una ficha nueva con un usuario ya registrado, buscado por email.")
public record PersonaVinculoRequest(
        @NotBlank @Email @Schema(example = "socio.registrado@mail.com") String email,
        @NotNull @Valid PersonaDatosRequest datos,
        @Schema(hidden = true) String contrasena) {}
