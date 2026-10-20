package com.vitalys.repository;

import com.vitalys.domain.Turno;
import java.time.OffsetDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TurnoRepository extends JpaRepository<Turno, Long>, JpaSpecificationExecutor<Turno> {

    List<Turno> findByPersonaIdOrderByInicioDesc(Long personaId);

    /**
     * Lugares ocupados por franja de gimnasio entre dos instantes. Usa la misma
     * {@code fn_turno_ocupa_lugar} que el trigger de cupo, para que el número que ve la
     * pantalla no pueda divergir del que aplica el motor.
     */
    @Query(
            value = "SELECT inicio, COUNT(*) FROM turnos WHERE tipo_turno = 'GYM' AND inicio >= :desde "
                    + "AND inicio < :hasta AND fn_turno_ocupa_lugar(estado, inicio, cancelado_en) GROUP BY inicio",
            nativeQuery = true)
    List<Object[]> contarOcupadosGym(@Param("desde") OffsetDateTime desde, @Param("hasta") OffsetDateTime hasta);

    /** RF-35: la franja de gimnasio terminó sin check-in → AUSENTE. */
    @Modifying
    @Query(
            value = "UPDATE turnos SET estado = 'AUSENTE' WHERE tipo_turno = 'GYM' AND estado = 'RESERVADO' AND fin <= :ahora",
            nativeQuery = true)
    int marcarAusentesGym(@Param("ahora") OffsetDateTime ahora);

    /** Usuario del profesional a cargo, para saber si quien marca el turno es el propio. */
    @Query(value = "SELECT usuario_id FROM profesionales WHERE id = :profesionalId", nativeQuery = true)
    Long usuarioDelProfesional(@Param("profesionalId") Long profesionalId);
}
