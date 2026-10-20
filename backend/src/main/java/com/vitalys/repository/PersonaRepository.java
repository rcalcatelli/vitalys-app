package com.vitalys.repository;

import com.vitalys.domain.Persona;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface PersonaRepository extends JpaRepository<Persona, Long>, JpaSpecificationExecutor<Persona> {

    boolean existsByDni(String dni);

    boolean existsByDniAndIdNot(String dni, Long id);

    Optional<Persona> findByUsuarioId(Long usuarioId);
}
