package com.vitalys.dto;

import com.vitalys.domain.Especialidad;
import com.vitalys.domain.Profesional;

/** Vista de un profesional. Nunca expone el hash de la contraseña del usuario asociado. */
public record ProfesionalResponse(
        Long id,
        Long usuarioId,
        String email,
        String nombre,
        String apellido,
        Especialidad especialidad,
        int duracionTurnoMinutos,
        boolean activo) {

    public static ProfesionalResponse de(Profesional p) {
        return new ProfesionalResponse(
                p.getId(),
                p.getUsuario().getId(),
                p.getUsuario().getEmail(),
                p.getNombre(),
                p.getApellido(),
                p.getEspecialidad(),
                p.getDuracionTurnoMinutos(),
                p.isActivo());
    }
}
