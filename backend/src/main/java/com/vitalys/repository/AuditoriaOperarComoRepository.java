package com.vitalys.repository;

import com.vitalys.domain.AccionOperarComo;
import com.vitalys.domain.AuditoriaOperarComo;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AuditoriaOperarComoRepository extends JpaRepository<AuditoriaOperarComo, Long> {

    /** Las marcas de ciclo de vida (INICIO/FIN) de una sesión: con INICIO y sin FIN, la sesión está viva. */
    @Query("SELECT a.accion FROM AuditoriaOperarComo a WHERE a.sesionId = :sesionId AND a.accion IN :acciones")
    List<AccionOperarComo> accionesDeSesion(
            @Param("sesionId") UUID sesionId, @Param("acciones") List<AccionOperarComo> acciones);

    List<AuditoriaOperarComo> findBySesionIdOrderByIdAsc(UUID sesionId);
}
