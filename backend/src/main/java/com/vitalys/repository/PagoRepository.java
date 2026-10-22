package com.vitalys.repository;

import com.vitalys.domain.Pago;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PagoRepository extends JpaRepository<Pago, Long> {

    List<Pago> findByPersonaIdOrderByFechaPagoDesc(Long personaId);
}
