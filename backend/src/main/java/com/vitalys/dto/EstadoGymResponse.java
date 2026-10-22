package com.vitalys.dto;

/**
 * Estado de gimnasio de una persona para decidir qué mostrarle antes de reservar. Usa el mismo
 * veredicto que la reserva: {@code suspendido} es false si una excepción vigente la habilita.
 */
public record EstadoGymResponse(
        boolean esSocioGym, boolean suspendido, int periodosImpagos, int umbral, boolean excepcionVigente) {}
