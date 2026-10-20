package com.vitalys.repository;

import com.vitalys.domain.ExcepcionMorosidad;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ExcepcionMorosidadRepository extends JpaRepository<ExcepcionMorosidad, Long> {

    List<ExcepcionMorosidad> findByPersonaIdOrderByCreadoEnDesc(Long personaId);
}
