package com.vitalys.dto;

import com.vitalys.domain.Especialidad;
import com.vitalys.domain.Profesional;

/**
 * Vista de un profesional. Nunca expone el hash de la contraseña del usuario asociado. Para quien
 * no es ADMIN ni el propio profesional se usa {@link #publica}, que deja {@code email} y
 * {@code usuarioId} en null: es lo que un paciente necesita para elegir con quién sacar turno.
 */
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

    public static ProfesionalResponse publica(Profesional p) {
        return new ProfesionalResponse(
                p.getId(),
                null,
                null,
                p.getNombre(),
                p.getApellido(),
                p.getEspecialidad(),
                p.getDuracionTurnoMinutos(),
                p.isActivo());
    }
}
