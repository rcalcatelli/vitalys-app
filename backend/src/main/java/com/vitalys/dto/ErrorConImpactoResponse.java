package com.vitalys.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.OffsetDateTime;

/**
 * 409 de RN-24 / RN-25: el cambio cancelaría turnos y falta la confirmación explícita
 * ({@code confirmar=true}). Mismo contrato de error que el resto, más el impacto para mostrarlo.
 */
@Schema(description = "409 con el impacto: turnos que se cancelarían si se confirma.")
public class ErrorConImpactoResponse extends ErrorResponse {

    private final ImpactoResponse impacto;

    public ErrorConImpactoResponse(
            OffsetDateTime timestamp, int status, String error, String message, String path, ImpactoResponse impacto) {
        super(timestamp, status, error, message, path);
        this.impacto = impacto;
    }

    public ImpactoResponse getImpacto() {
        return impacto;
    }
}
