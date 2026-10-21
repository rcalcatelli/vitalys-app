package com.vitalys.dto;

import java.time.OffsetDateTime;

/** Un slot de la agenda de un profesional (W-02). {@code libre = false} si está tomado o ya pasó. */
public record SlotConsultorioResponse(OffsetDateTime inicio, OffsetDateTime fin, boolean libre) {}
