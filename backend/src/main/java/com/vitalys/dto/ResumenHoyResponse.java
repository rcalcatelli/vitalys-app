package com.vitalys.dto;

import java.time.LocalDate;
import java.util.List;

/**
 * Panel "Hoy en el centro" del ADMIN. {@code suspendidos} cuenta a quienes no pueden reservar
 * gimnasio: alcanzaron el umbral y no tienen excepción vigente.
 */
public record ResumenHoyResponse(
        LocalDate fecha,
        int enGimnasioAhora,
        int turnosGymHoy,
        int consultasHoy,
        int conDeuda,
        int suspendidos,
        List<FranjaGymResponse> franjasGym,
        List<SocioConDeudaResponse> requierenAtencion) {}
