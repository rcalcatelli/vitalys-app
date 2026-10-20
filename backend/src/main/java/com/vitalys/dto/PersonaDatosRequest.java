package com.vitalys.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

/** Body de {@code PUT /api/personas/{id}} (RF-07). El estado no se edita acá: tiene sus endpoints. */
@Schema(description = "Datos editables de una persona.")
public record PersonaDatosRequest(
        @NotBlank @Size(max = 100) @Schema(example = "Juan") String nombre,
        @NotBlank @Size(max = 100) @Schema(example = "García") String apellido,
        @NotBlank @Pattern(regexp = "\\d{7,9}", message = "El DNI debe tener entre 7 y 9 dígitos")
                @Schema(example = "38100002")
                String dni,
        @Size(max = 30) @Schema(example = "11-2002-0002") String telefono,
        @Past @Schema(example = "1990-07-22") LocalDate fechaNacimiento,
        @Schema(example = "true") boolean esSocioGym,
        @Schema(description = "Obligatoria si esSocioGym = true; se ignora si es false", example = "2026-10-01")
                LocalDate fechaInicioMembresia) {}
