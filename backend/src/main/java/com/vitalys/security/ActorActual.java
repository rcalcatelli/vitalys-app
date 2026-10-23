package com.vitalys.security;

import com.vitalys.domain.Usuario;
import java.util.Optional;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

/**
 * Acceso a la sesión de "Operar como" de la request en curso (design.md §4). Fuera de una sesión
 * de "Operar como" todo devuelve vacío: el actor es simplemente el usuario autenticado.
 */
@Component
public class ActorActual {

    /** La sesión de "Operar como" en curso, si la hay. */
    public Optional<OperarComoAuthentication> sesion() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth instanceof OperarComoAuthentication operarComo ? Optional.of(operarComo) : Optional.empty();
    }

    /** El ADMIN real que opera en nombre del socio autenticado, si la request es de "Operar como". */
    public Optional<Usuario> operador() {
        return sesion().map(OperarComoAuthentication::getOperador);
    }

    public boolean operando() {
        return sesion().isPresent();
    }

    /** Quién hizo realmente una escritura: el ADMIN si se está operando como el socio, si no el actor (D8). */
    public Long idDeQuienOpera(Usuario actor) {
        return operador().map(Usuario::getId).orElse(actor.getId());
    }
}
