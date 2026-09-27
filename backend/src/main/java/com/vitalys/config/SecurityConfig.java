package com.vitalys.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.vitalys.dto.ErrorResponse;
import com.vitalys.security.JwtAuthenticationFilter;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.OffsetDateTime;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

/**
 * {@code SecurityFilterChain} stateless (RNF-02, design.md §3). Rutas públicas: registro, login
 * y health. Todo lo demás exige JWT válido. La regla declarativa {@code /api/admin/**} exige
 * {@code ROLE_ADMIN} — es la primera barrera, no la única (RNF-03 exige además verificación en
 * Service para reglas de negocio).
 *
 * <p><b>401 vs 403 (PI-05/PI-06):</b> sin un {@code AuthenticationEntryPoint} explícito, Spring
 * Security 6 usa por defecto {@code Http403ForbiddenEntryPoint} para CUALQUIER
 * {@code AuthenticationException} (falta de token / token inválido), devolviendo 403 donde el
 * contrato exige 401. Acá se configuran explícitamente un entry point (401, sin token o token
 * inválido/expirado) y un {@code AccessDeniedHandler} (403, token válido pero rol insuficiente),
 * ambos devolviendo el mismo contrato {@link ErrorResponse} que {@code GlobalExceptionHandler}.
 *
 * <p><b>Convención de autoridades:</b> {@code Usuario#getAuthorities()} antepone {@code ROLE_} al
 * nombre del enum ({@code rol_usuario} no tiene ese prefijo en la base). Este archivo usa
 * {@code hasRole("ADMIN")}, que Spring traduce a la autoridad {@code ROLE_ADMIN} — coincide con
 * lo que emite la entidad. Se eligió {@code hasRole}/prefijo {@code ROLE_} (convención estándar
 * de Spring Security) en vez de {@code hasAuthority} sin prefijo.
 */
@Configuration
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http, ObjectMapper objectMapper) throws Exception {
        http.csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(handling -> handling
                        .authenticationEntryPoint((request, response, authException) -> escribirError(
                                response,
                                HttpStatus.UNAUTHORIZED,
                                "No autenticado: token ausente, inválido o expirado",
                                request.getRequestURI(),
                                objectMapper))
                        .accessDeniedHandler((request, response, accessDeniedException) -> escribirError(
                                response,
                                HttpStatus.FORBIDDEN,
                                "Acceso denegado: el rol del usuario no tiene permiso para este recurso",
                                request.getRequestURI(),
                                objectMapper)))
                .authorizeHttpRequests(auth -> auth.requestMatchers(
                                "/api/auth/registro", "/api/auth/login", "/api/health")
                        .permitAll()
                        .requestMatchers("/api/admin/**")
                        .hasRole("ADMIN")
                        .anyRequest()
                        .authenticated())
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    private static void escribirError(
            HttpServletResponse response, HttpStatus status, String message, String path, ObjectMapper objectMapper)
            throws IOException {
        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        ErrorResponse body = new ErrorResponse(OffsetDateTime.now(), status.value(), status.getReasonPhrase(), message, path);
        objectMapper.writeValue(response.getWriter(), body);
    }
}
