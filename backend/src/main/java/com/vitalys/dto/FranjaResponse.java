package com.vitalys.dto;

import com.vitalys.domain.DisponibilidadProfesional;
import java.time.LocalTime;

public record FranjaResponse(Long id, int diaSemana, LocalTime horaInicio, LocalTime horaFin) {

    public static FranjaResponse de(DisponibilidadProfesional d) {
        return new FranjaResponse(d.getId(), d.getDiaSemana(), d.getHoraInicio(), d.getHoraFin());
    }
}
