package com.vitalys.repository;

import com.vitalys.domain.EstadoPersona;
import com.vitalys.domain.Persona;
import com.vitalys.domain.RolUsuario;
import org.springframework.data.jpa.domain.Specification;

/**
 * Filtros del listado (RF-06). Cada filtro ausente devuelve {@code null}, que Spring Data
 * ignora al combinar: así no se mandan parámetros nulos a Postgres, que no puede inferir su tipo.
 */
public final class PersonaSpecifications {

    private PersonaSpecifications() {}

    public static Specification<Persona> conEstado(EstadoPersona estado) {
        return (root, query, cb) -> estado == null ? null : cb.equal(root.get("estado"), estado);
    }

    public static Specification<Persona> soloSociosGym(boolean soloGym) {
        return (root, query, cb) -> soloGym ? cb.isTrue(root.<Boolean>get("esSocioGym")) : null;
    }

    /** Solo las personas cuyo usuario tiene ese rol (el listado excluye al ADMIN y a los profesionales). */
    public static Specification<Persona> conRolDeUsuario(RolUsuario rol) {
        return (root, query, cb) -> cb.equal(root.get("usuario").<RolUsuario>get("rol"), rol);
    }

    /** Busca por nombre, apellido o DNI, sin distinguir mayúsculas. */
    public static Specification<Persona> coincideCon(String texto) {
        return (root, query, cb) -> {
            if (texto == null || texto.isBlank()) {
                return null;
            }
            String patron = "%" + texto.trim().toLowerCase() + "%";
            return cb.or(
                    cb.like(cb.lower(root.<String>get("nombre")), patron),
                    cb.like(cb.lower(root.<String>get("apellido")), patron),
                    cb.like(root.<String>get("dni"), patron));
        };
    }
}
