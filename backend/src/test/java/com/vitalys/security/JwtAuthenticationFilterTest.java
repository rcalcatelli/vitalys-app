package com.vitalys.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.vitalys.domain.RolUsuario;
import com.vitalys.domain.Usuario;
import io.jsonwebtoken.ExpiredJwtException;
import jakarta.servlet.FilterChain;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetailsService;

/**
 * Un token vigente de un usuario deshabilitado (usuarios.activo = false) no debe autenticar: sin
 * esto, dar de baja a un profesional solo bloquearía el login y su token seguiría sirviendo.
 */
class JwtAuthenticationFilterTest {

    private JwtService jwtService;
    private UserDetailsService userDetailsService;
    private OperarComoAutenticador autenticador;
    private JwtAuthenticationFilter filtro;
    private FilterChain cadena;
    private MockHttpServletRequest request;

    @BeforeEach
    void setUp() {
        SecurityContextHolder.clearContext();
        jwtService = mock(JwtService.class);
        userDetailsService = mock(UserDetailsService.class);
        autenticador = mock(OperarComoAutenticador.class);
        filtro = new JwtAuthenticationFilter(jwtService, userDetailsService, autenticador);
        cadena = mock(FilterChain.class);
        request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer token-de-prueba");
        when(jwtService.verificar("token-de-prueba"))
                .thenReturn(new JwtService.TokenVerificado("prof@vitalys.com", 4L, Optional.empty(), null, null));
    }

    @AfterEach
    void limpiar() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void usuarioHabilitado_quedaAutenticado() throws Exception {
        Usuario activo = new Usuario("prof@vitalys.com", "hash", RolUsuario.PROFESIONAL);
        when(userDetailsService.loadUserByUsername("prof@vitalys.com")).thenReturn(activo);

        filtro.doFilter(request, new MockHttpServletResponse(), cadena);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNotNull();
        assertThat(SecurityContextHolder.getContext().getAuthentication().getPrincipal()).isSameAs(activo);
        verify(cadena).doFilter(eq(request), any());
    }

    @Test
    void usuarioDeshabilitado_noAutenticaYLaCadenaSigue() throws Exception {
        Usuario inactivo = new Usuario("prof@vitalys.com", "hash", RolUsuario.PROFESIONAL);
        inactivo.setActivo(false);
        when(userDetailsService.loadUserByUsername("prof@vitalys.com")).thenReturn(inactivo);

        filtro.doFilter(request, new MockHttpServletResponse(), cadena);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        verify(cadena).doFilter(eq(request), any());
    }

    private JwtService.TokenVerificado operarComo() {
        return new JwtService.TokenVerificado(
                "socio@vitalys.com",
                7L,
                Optional.of(new JwtService.Actor("admin@vitalys.com", 1L)),
                UUID.randomUUID(),
                Instant.now().plusSeconds(600));
    }

    @Test
    void tokenInvalido_noAutenticaYLaCadenaSigue() throws Exception {
        when(jwtService.verificar("token-de-prueba")).thenThrow(new ExpiredJwtException(null, null, "vencido"));

        filtro.doFilter(request, new MockHttpServletResponse(), cadena);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        verifyNoInteractions(userDetailsService, autenticador);
        verify(cadena).doFilter(eq(request), any());
    }

    @Test
    void operarComoValido_principalEsElSocioYElOperadorQuedaAparte() throws Exception {
        Usuario socio = new Usuario("socio@vitalys.com", "hash", RolUsuario.SOCIO_PACIENTE);
        Usuario admin = new Usuario("admin@vitalys.com", "hash", RolUsuario.ADMIN);
        JwtService.TokenVerificado token = operarComo();
        when(jwtService.verificar("token-de-prueba")).thenReturn(token);
        when(autenticador.autenticar(token))
                .thenReturn(Optional.of(new OperarComoAuthentication(socio, admin, token.sesionId(), token.expiraEn())));

        filtro.doFilter(request, new MockHttpServletResponse(), cadena);

        OperarComoAuthentication auth = (OperarComoAuthentication) SecurityContextHolder.getContext().getAuthentication();
        assertThat(auth.getPrincipal()).isSameAs(socio);
        assertThat(auth.getOperador()).isSameAs(admin);
        assertThat(auth.getAuthorities()).extracting(Object::toString).containsExactly("ROLE_SOCIO_PACIENTE");
        assertThat(auth.getName()).isEqualTo("socio@vitalys.com");
        verifyNoInteractions(userDetailsService);
    }

    @Test
    void operarComoRechazado_noSeDegradaAUnaSesionNormalDelSocio() throws Exception {
        JwtService.TokenVerificado token = operarComo();
        when(jwtService.verificar("token-de-prueba")).thenReturn(token);
        when(autenticador.autenticar(token)).thenReturn(Optional.empty());

        filtro.doFilter(request, new MockHttpServletResponse(), cadena);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        verifyNoInteractions(userDetailsService);
        verify(cadena).doFilter(eq(request), any());
    }

    @Test
    void errorAlValidarOperarComo_limpiaElContexto() throws Exception {
        JwtService.TokenVerificado token = operarComo();
        when(jwtService.verificar("token-de-prueba")).thenReturn(token);
        when(autenticador.autenticar(token)).thenThrow(new IllegalStateException("base caída"));

        filtro.doFilter(request, new MockHttpServletResponse(), cadena);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        verify(cadena).doFilter(eq(request), any());
    }
}
