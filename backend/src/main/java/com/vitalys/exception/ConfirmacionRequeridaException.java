package com.vitalys.exception;

import com.vitalys.dto.ImpactoResponse;

/** El cambio cancelaría turnos futuros (RN-24/RN-25) y no vino {@code confirmar=true}. 409 con el impacto. */
public class ConfirmacionRequeridaException extends RuntimeException {

    private final transient ImpactoResponse impacto;

    public ConfirmacionRequeridaException(String message, ImpactoResponse impacto) {
        super(message);
        this.impacto = impacto;
    }

    public ImpactoResponse getImpacto() {
        return impacto;
    }
}
