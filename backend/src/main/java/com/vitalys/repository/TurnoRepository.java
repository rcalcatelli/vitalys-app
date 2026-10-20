package com.vitalys.repository;

import com.vitalys.domain.EstadoTurno;
import com.vitalys.domain.TipoTurno;
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

    /**
     * Turnos de consultorio RESERVADOS que empiezan después de {@code desde}, con la persona y su
     * usuario ya cargados (el aviso de cancelación necesita nombre y email). Es la base del cálculo
     * de impacto de RN-24: los pasados y los que ya no están reservados nunca se tocan.
     */
    @Query("""
            select t from Turno t
            join fetch t.persona p
            join fetch p.usuario
            where t.profesionalId = :profesionalId
              and t.tipoTurno = :tipo
              and t.estado = :estado
              and t.inicio > :desde
            order by t.inicio
            """)
    List<Turno> buscarFuturos(
            @Param("profesionalId") Long profesionalId,
            @Param("tipo") TipoTurno tipo,
            @Param("estado") EstadoTurno estado,
            @Param("desde") OffsetDateTime desde);

    /**
     * Los literales de enum van como parámetros y no escritos en el JPQL: con ENUM nativo de
     * PostgreSQL (NAMED_ENUM), Hibernate castea un literal al nombre de la clase Java y falla.
     */
    default List<Turno> futurosReservadosDeConsultorio(Long profesionalId, OffsetDateTime desde) {
        return buscarFuturos(profesionalId, TipoTurno.CONSULTORIO, EstadoTurno.RESERVADO, desde);
    }

    /** Usuario del profesional a cargo, para saber si quien marca el turno es el propio. */
    @Query(value = "SELECT usuario_id FROM profesionales WHERE id = :profesionalId", nativeQuery = true)
    Long usuarioDelProfesional(@Param("profesionalId") Long profesionalId);
}
