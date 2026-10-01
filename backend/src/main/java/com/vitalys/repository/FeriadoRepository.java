package com.vitalys.repository;

import com.vitalys.domain.Feriado;
import com.vitalys.domain.OrigenFeriado;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** Acceso a {@code feriados} (RN-14, RF-38). */
public interface FeriadoRepository extends JpaRepository<Feriado, LocalDate> {

    /** Feriados de un año, en cualquier origen. */
    @Query("SELECT f FROM Feriado f WHERE f.fecha >= :desde AND f.fecha <= :hasta ORDER BY f.fecha")
    List<Feriado> findEntreFechas(@Param("desde") LocalDate desde, @Param("hasta") LocalDate hasta);

    /**
     * Feriados de un año con un origen dado. Lo usa el sincronizador para dar de baja lo que el
     * Estado sacó del calendario sin tocar las filas {@code MANUAL} del ADMIN.
     *
     * <p>El origen va como <strong>parámetro</strong> y no como literal de enum dentro del JPQL.
     * Con un literal, Hibernate arma el cast con el nombre de la clase Java
     * ({@code 'OFICIAL'::OrigenFeriado}) en vez del tipo nativo de Postgres
     * ({@code origen_feriado}), y la consulta revienta con
     * {@code type "origenferiado" does not exist}. Bindeado como parámetro usa el mapeo de la
     * entidad ({@code @JdbcTypeCode(NAMED_ENUM)}) y resuelve bien.
     */
    @Query(
            "SELECT f FROM Feriado f WHERE f.origen = :origen AND f.fecha >= :desde AND f.fecha <= :hasta")
    List<Feriado> findPorOrigenEntreFechas(
            @Param("origen") OrigenFeriado origen,
            @Param("desde") LocalDate desde,
            @Param("hasta") LocalDate hasta);

    /** Día de cierre para una fecha, si lo hay. Lo consulta la reserva de gimnasio. */
    @Query("SELECT f FROM Feriado f WHERE f.fecha = :fecha AND f.cierraGimnasio = true")
    Optional<Feriado> findCierrePorFecha(@Param("fecha") LocalDate fecha);
}
