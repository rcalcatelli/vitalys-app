package com.vitalys.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.OffsetDateTime;

/**
 * Credencial de "Operar como" (RF-39, RN-26): vence en {@code expiraEn} (30 minutos) y no se renueva.
 * El cliente la guarda aparte de la sesión del ADMIN y la descarta al terminar o al recibir un 401.
 */
@Schema(description = "Credencial de vida corta para operar en nombre de un socio.")
public record OperarComoResponse(String token, OffsetDateTime expiraEn, PersonaResumen persona) {

    public record PersonaResumen(Long id, String nombre, String apellido) {}
}
