package com.vitalys.dto;

import com.vitalys.domain.Especialidad;
import com.vitalys.domain.EstadoPersona;
import com.vitalys.domain.Persona;
import com.vitalys.domain.RolUsuario;
import com.vitalys.service.MorosidadService.VeredictoMorosidad;
import java.time.LocalDate;
import java.util.List;

/**
 * Vista de una persona. Nunca expone el hash de la contraseña del usuario asociado.
 *
 * <p>{@code cuota}, {@code especialidades} y {@code tieneUsuarioSocio} alimentan el listado del ADMIN
 * (RF-43). {@code cuota} es null si no es socia de gimnasio; en las respuestas de escritura
 * ({@link #de(Persona)}) viene null y {@code especialidades} vacía: el listado se vuelve a pedir.
 */
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
        LocalDate fechaBaja,
        CuotaInfo cuota,
        List<Especialidad> especialidades,
        boolean tieneUsuarioSocio) {

    /** Deuda de gimnasio según {@code MorosidadService} (RN-01); {@code excepcionHasta} solo si hay excepción vigente. */
    public record CuotaInfo(int periodosImpagos, int umbral, boolean suspendido, LocalDate excepcionHasta) {

        static CuotaInfo de(VeredictoMorosidad v) {
            return new CuotaInfo(
                    v.deuda().periodosImpagos(),
                    v.deuda().umbral(),
                    v.bloqueado(),
                    v.excepcion().map(e -> e.getValidaHasta()).orElse(null));
        }
    }

    public static PersonaResponse de(Persona p) {
        return armar(p, null, List.of());
    }

    /** Vista del listado: suma la cuota (null si no es socia de gimnasio) y las especialidades atendidas. */
    public static PersonaResponse de(Persona p, VeredictoMorosidad veredicto, List<Especialidad> especialidades) {
        boolean conCuota = p.isEsSocioGym() && p.getFechaInicioMembresia() != null && veredicto != null;
        return armar(p, conCuota ? CuotaInfo.de(veredicto) : null, especialidades);
    }

    private static PersonaResponse armar(Persona p, CuotaInfo cuota, List<Especialidad> especialidades) {
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
                p.getFechaBaja(),
                cuota,
                especialidades,
                p.getUsuario().getRol() == RolUsuario.SOCIO_PACIENTE && p.getUsuario().isEnabled());
    }
}
