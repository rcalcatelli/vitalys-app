package com.vitalys.dto;

import com.vitalys.domain.Especialidad;
import java.time.LocalDate;

/**
 * Próximo día con turnos libres de un profesional (RF-41). {@code fecha} es null y {@code libres} 0 si
 * no tiene agenda dentro del horizonte ("Sin agenda próxima").
 */
public record ProximaAgendaResponse(
        Long profesionalId,
        String nombre,
        String apellido,
        Especialidad especialidad,
        int duracionTurnoMinutos,
        LocalDate fecha,
        int libres) {}
