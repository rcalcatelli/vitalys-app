package com.vitalys.repository;

import com.vitalys.domain.Usuario;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UsuarioRepository extends JpaRepository<Usuario, Long> {

    Optional<Usuario> findByEmail(String email);

    /**
     * Login por DNI (RF-36). No existe entidad {@code Persona} en el backend todavía (Sprint 3),
     * así que se resuelve con una consulta nativa que une {@code usuarios} con {@code personas}
     * por {@code personas.usuario_id} — {@code personas.dni} es la única tabla que tiene DNI
     * (`db/migration/V1__esquema_inicial.sql`, `profesionales` no tiene esa columna). Solo
     * devuelve resultado para quien ya tiene ficha cargada en {@code personas}.
     */
    @Query(
            value = "SELECT u.* FROM usuarios u JOIN personas p ON p.usuario_id = u.id WHERE p.dni = :dni",
            nativeQuery = true)
    Optional<Usuario> findByPersonaDni(@Param("dni") String dni);
}
