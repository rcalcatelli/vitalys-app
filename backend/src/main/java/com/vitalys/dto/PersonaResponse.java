package com.vitalys.dto;

import com.vitalys.domain.EstadoPersona;
import com.vitalys.domain.Persona;
import java.time.LocalDate;

/** Vista de una persona. Nunca expone el hash de la contraseña del usuario asociado. */
public record PersonaResponse(
        Long id,
        Long usuarioId,
        String email,
        String nombre,
        String apellido,
        String dni,
        String telefono,
        LocalDate fechaNacimiento,
        EstadoPersona estado,
        boolean esSocioGym,
        LocalDate fechaInicioMembresia,
        LocalDate fechaAlta,
        LocalDate fechaBaja) {

    public static PersonaResponse de(Persona p) {
        return new PersonaResponse(
                p.getId(),
                p.getUsuario().getId(),
                p.getUsuario().getEmail(),
                p.getNombre(),
                p.getApellido(),
                p.getDni(),
                p.getTelefono(),
                p.getFechaNacimiento(),
                p.getEstado(),
                p.isEsSocioGym(),
                p.getFechaInicioMembresia(),
                p.getFechaAlta(),
                p.getFechaBaja());
    }
}
