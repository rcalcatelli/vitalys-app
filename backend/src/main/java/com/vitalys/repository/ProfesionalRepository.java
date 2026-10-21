package com.vitalys.repository;

import com.vitalys.domain.Profesional;
import java.util.List;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProfesionalRepository extends JpaRepository<Profesional, Long> {

    Optional<Profesional> findByUsuarioId(Long usuarioId);

    List<Profesional> findByActivo(boolean activo, Sort orden);

    /** Bloquea la fila para serializar las escrituras de disponibilidad de un mismo profesional. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Profesional p where p.id = :id")
    Optional<Profesional> buscarParaActualizar(@Param("id") Long id);
}
