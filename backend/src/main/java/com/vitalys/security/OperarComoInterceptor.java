package com.vitalys.security;

import com.vitalys.exception.AccesoDenegadoException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Set;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.HandlerMapping;

/**
 * Lista blanca de escrituras durante "Operar como" (design.md D7). Mientras la request es de una
 * sesión de "Operar como", solo pasan las lecturas (GET/HEAD/OPTIONS) y las escrituras de la lista:
 * reservar gimnasio, reservar consultorio, cancelar un turno y terminar la sesión. Cualquier otra
 * escritura responde 403, aunque el socio pudiera hacerla por sí mismo: es defensa en profundidad
 * para endpoints de socio que se agreguen más adelante (perfil, contraseña) y que no auditan.
 *
 * <p>Se compara contra el patrón del handler que Spring eligió ({@code /api/turnos/{id}/cancelar}),
 * no contra la URI cruda: así ninguna variante de la ruta (barra final, mayúsculas, codificación)
 * puede colar una escritura que la lista no contempla.
 */
@Component
public class OperarComoInterceptor implements HandlerInterceptor {

    static final Set<String> ESCRITURAS_PERMITIDAS = Set.of(
            "POST /api/turnos/gym",
            "POST /api/turnos",
            "PATCH /api/turnos/{id}/cancelar",
            "POST /api/operar-como/fin");

    private static final Set<String> LECTURAS = Set.of("GET", "HEAD", "OPTIONS");

    private final ActorActual actorActual;

    public OperarComoInterceptor(ActorActual actorActual) {
        this.actorActual = actorActual;
    }

    @Override
    public boolean preHandle(@NonNull HttpServletRequest request, @NonNull HttpServletResponse response, @NonNull Object handler) {
        if (!actorActual.operando() || LECTURAS.contains(request.getMethod())) {
            return true;
        }
        Object patron = request.getAttribute(HandlerMapping.BEST_MATCHING_PATTERN_ATTRIBUTE);
        if (patron != null && ESCRITURAS_PERMITIDAS.contains(request.getMethod() + " " + patron)) {
            return true;
        }
        throw new AccesoDenegadoException("No disponible mientras operás como socio");
    }
}
