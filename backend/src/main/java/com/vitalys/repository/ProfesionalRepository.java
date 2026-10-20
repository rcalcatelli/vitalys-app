package com.vitalys.repository;

import com.vitalys.domain.Profesional;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProfesionalRepository extends JpaRepository<Profesional, Long> {

    Optional<Profesional> findByUsuarioId(Long usuarioId);

    List<Profesional> findByActivo(boolean activo, Sort orden);
}
