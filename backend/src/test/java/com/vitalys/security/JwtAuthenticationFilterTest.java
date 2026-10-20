package com.vitalys.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.vitalys.domain.RolUsuario;
import com.vitalys.domain.Usuario;
import jakarta.servlet.FilterChain;
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
    private JwtAuthenticationFilter filtro;
    private FilterChain cadena;
    private MockHttpServletRequest request;

    @BeforeEach
    void setUp() {
        SecurityContextHolder.clearContext();
        jwtService = mock(JwtService.class);
        userDetailsService = mock(UserDetailsService.class);
        filtro = new JwtAuthenticationFilter(jwtService, userDetailsService);
        cadena = mock(FilterChain.class);
        request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer token-de-prueba");
        when(jwtService.esValido("token-de-prueba")).thenReturn(true);
        when(jwtService.extraerEmail("token-de-prueba")).thenReturn("prof@vitalys.com");
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
}
