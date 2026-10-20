package com.vitalys.dto;

import java.time.OffsetDateTime;

/** Una franja de la grilla del gimnasio con su ocupación (W-08). */
public record FranjaGymResponse(OffsetDateTime inicio, OffsetDateTime fin, int cupo, int ocupados, int disponibles) {}
