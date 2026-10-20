package com.vitalys.repository;

import com.vitalys.domain.DisponibilidadProfesional;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DisponibilidadProfesionalRepository extends JpaRepository<DisponibilidadProfesional, Long> {

    List<DisponibilidadProfesional> findByProfesionalIdOrderByDiaSemanaAscHoraInicioAsc(Long profesionalId);
}
