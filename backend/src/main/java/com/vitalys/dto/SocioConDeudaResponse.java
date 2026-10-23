package com.vitalys.dto;

import java.time.LocalDate;

/** Un socio del gimnasio con períodos impagos, para "Requieren atención" del panel del ADMIN. */
public record SocioConDeudaResponse(
        Long personaId,
        String persona,
        String nombrePila,
        String apellido,
        String dni,
        int periodosImpagos,
        int umbral,
        boolean suspendido,
        LocalDate excepcionHasta) {}
