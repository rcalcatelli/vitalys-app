package com.vitalys.repository;

import com.vitalys.domain.Persona;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PersonaRepository extends JpaRepository<Persona, Long>, JpaSpecificationExecutor<Persona> {

    boolean existsByDni(String dni);

    boolean existsByDniAndIdNot(String dni, Long id);

    Optional<Persona> findByUsuarioId(Long usuarioId);

    /**
     * Especialidades en las que cada persona tuvo turnos de consultorio que no se cancelaron
     * (chips de servicio de Personas, RF-43). Una sola consulta para todo el listado.
     * Filas: {@code [persona_id, especialidad]}.
     */
    @Query(
            value = "SELECT DISTINCT t.persona_id, pr.especialidad::text FROM turnos t "
                    + "JOIN profesionales pr ON pr.id = t.profesional_id "
                    + "WHERE t.tipo_turno = 'CONSULTORIO' AND t.persona_id IN (:ids) "
                    + "AND t.estado NOT IN ('CANCELADO_EN_TIEMPO', 'CANCELADO_TARDE', 'CANCELADO_POR_PROFESIONAL') "
                    + "ORDER BY 1, 2",
            nativeQuery = true)
    List<Object[]> especialidadesAtendidas(@Param("ids") Collection<Long> ids);
}
