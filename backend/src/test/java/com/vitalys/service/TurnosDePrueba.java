package com.vitalys.service;

import com.vitalys.domain.Persona;
import com.vitalys.domain.RolUsuario;
import com.vitalys.domain.TipoTurno;
import com.vitalys.domain.Turno;
import com.vitalys.domain.Usuario;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import org.springframework.test.util.ReflectionTestUtils;

/** Armado de turnos de consultorio para tests unitarios (no hay factory de producción: se crean por SQL). */
final class TurnosDePrueba {

    private TurnosDePrueba() {}

    static Persona paciente(Long id, String nombre, String email) {
        Usuario usuario = new Usuario(email, "hash", RolUsuario.SOCIO_PACIENTE);
        usuario.setId(id + 100);
        Persona persona = new Persona(usuario, LocalDate.of(2026, 1, 1));
        persona.setId(id);
        persona.setNombre(nombre);
        persona.setApellido("Prueba");
        return persona;
    }

    static Turno consultorio(Long id, Persona persona, Long profesionalId, String inicio, String fin) {
        Turno t = Turno.deGimnasio(persona, persona.getUsuario().getId(), OffsetDateTime.parse(inicio));
        ReflectionTestUtils.setField(t, "id", id);
        ReflectionTestUtils.setField(t, "tipoTurno", TipoTurno.CONSULTORIO);
        ReflectionTestUtils.setField(t, "profesionalId", profesionalId);
        ReflectionTestUtils.setField(t, "fin", OffsetDateTime.parse(fin));
        return t;
    }
}
