package com.vitalys.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.OffsetDateTime;

/** Contrato uniforme de error, mapeado por {@code GlobalExceptionHandler} (design.md §5). */
@Schema(description = "Contrato uniforme de error.")
public class ErrorResponse {

    private final OffsetDateTime timestamp;

    @Schema(example = "401")
    private final int status;

    @Schema(example = "Unauthorized")
    private final String error;

    @Schema(example = "No autenticado: token ausente, inválido o expirado")
    private final String message;

    @Schema(example = "/api/auth/me")
    private final String path;

    public ErrorResponse(OffsetDateTime timestamp, int status, String error, String message, String path) {
        this.timestamp = timestamp;
        this.status = status;
        this.error = error;
        this.message = message;
        this.path = path;
    }

    public OffsetDateTime getTimestamp() {
        return timestamp;
    }

    public int getStatus() {
        return status;
    }

    public String getError() {
        return error;
    }

    public String getMessage() {
        return message;
    }

    public String getPath() {
        return path;
    }
}
