package com.vitalys.repository;

import com.vitalys.domain.Notificacion;
import java.time.OffsetDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface NotificacionRepository extends JpaRepository<Notificacion, Long> {

    /**
     * Fallidas para la alerta del ADMIN: las definitivas (2 intentos) y las huérfanas, es decir,
     * en curso cuyo último movimiento es anterior a {@code limite}. Una en curso reciente no se
     * lista: todavía puede resolverse sola.
     */
    @Query("""
            select n from Notificacion n
            join fetch n.persona
            left join fetch n.turno
            where n.exitoso = false
              and (n.intentos >= :maxIntentos
                   or coalesce(n.ultimoIntentoEn, n.enviadoEn) < :limite)
            order by coalesce(n.ultimoIntentoEn, n.enviadoEn) desc, n.id desc
            """)
    List<Notificacion> buscarFallidas(
            @Param("maxIntentos") int maxIntentos, @Param("limite") OffsetDateTime limite);

    /** Si ya hay un aviso de deuda o de suspensión para ese período (RF-37, V15). */
    boolean existsByPersonaIdAndPeriodo(Long personaId, java.time.LocalDate periodo);
}
