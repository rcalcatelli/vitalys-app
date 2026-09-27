package com.vitalys.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Filtro que SOLO autentica (valida firma + expiración del JWT y puebla el
 * {@link SecurityContextHolder}). NO decide autorización por rol — eso vive en la capa Service
 * (RNF-03, design.md §3/§4). El chequeo declarativo de {@code SecurityConfig} es la primera
 * barrera, pero no basta sola.
 *
 * <p>Cualquier fallo al resolver el usuario del token (p.ej. {@code UsernameNotFoundException}
 * si el usuario fue borrado después de emitirse el JWT) se captura acá: NUNCA debe escapar del
 * filtro, porque este filtro corre antes que {@code ExceptionTranslationFilter} en la cadena
 * (se registra con {@code addFilterBefore(..., UsernamePasswordAuthenticationFilter.class)}), así
 * que una excepción no controlada no sería traducida a una respuesta HTTP por Spring Security —
 * escaparía como error no manejado del contenedor. En su lugar, se limpia el contexto y se deja
 * que {@code AuthorizationFilter} + el {@code AuthenticationEntryPoint} de {@code SecurityConfig}
 * respondan 401 de forma consistente.
 */
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(JwtAuthenticationFilter.class);
    private static final String BEARER_PREFIX = "Bearer ";

    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;

    public JwtAuthenticationFilter(JwtService jwtService, UserDetailsService userDetailsService) {
        this.jwtService = jwtService;
        this.userDetailsService = userDetailsService;
    }

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request, @NonNull HttpServletResponse response, @NonNull FilterChain chain)
            throws ServletException, IOException {

        String header = request.getHeader("Authorization");

        if (header != null && header.startsWith(BEARER_PREFIX)) {
            String token = header.substring(BEARER_PREFIX.length());

            try {
                if (jwtService.esValido(token) && SecurityContextHolder.getContext().getAuthentication() == null) {
                    String email = jwtService.extraerEmail(token);
                    UserDetails userDetails = userDetailsService.loadUserByUsername(email);

                    UsernamePasswordAuthenticationToken authToken =
                            new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
                    authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                }
            } catch (RuntimeException ex) {
                log.warn("No se pudo autenticar el JWT recibido: {}", ex.getMessage());
                SecurityContextHolder.clearContext();
            }
        }

        chain.doFilter(request, response);
    }
}
