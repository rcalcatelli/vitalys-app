package com.vitalys.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.vitalys.domain.AccionOperarComo;
import com.vitalys.domain.Persona;
import com.vitalys.domain.RolUsuario;
import com.vitalys.domain.Usuario;
import com.vitalys.repository.AuditoriaOperarComoRepository;
import com.vitalys.repository.PersonaRepository;
import com.vitalys.repository.UsuarioRepository;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** RN-26: la credencial de "Operar como" se revalida contra la base en cada request. */
class OperarComoAutenticadorTest {

    private UsuarioRepository usuarioRepository;
    private PersonaRepository personaRepository;
    private AuditoriaOperarComoRepository auditoriaRepository;
    private OperarComoAutenticador autenticador;

    private Usuario admin;
    private Usuario socio;
    private Persona ficha;
    private final UUID sesion = UUID.randomUUID();
    private final Instant vence = Instant.now().plusSeconds(600);

    @BeforeEach
    void setUp() {
        usuarioRepository = mock(UsuarioRepository.class);
        personaRepository = mock(PersonaRepository.class);
        auditoriaRepository = mock(AuditoriaOperarComoRepository.class);
        autenticador = new OperarComoAutenticador(usuarioRepository, personaRepository, auditoriaRepository);

        admin = new Usuario("admin@vitalys.test", "hash", RolUsuario.ADMIN);
        admin.setId(1L);
        socio = new Usuario("maria@vitalys.test", "hash", RolUsuario.SOCIO_PACIENTE);
        socio.setId(7L);
        ficha = new Persona(socio, LocalDate.of(2024, 1, 1));
        when(usuarioRepository.findByEmail("admin@vitalys.test")).thenReturn(Optional.of(admin));
        when(usuarioRepository.findByEmail("maria@vitalys.test")).thenReturn(Optional.of(socio));
        when(personaRepository.findByUsuarioId(7L)).thenReturn(Optional.of(ficha));
        when(auditoriaRepository.accionesDeSesion(eq(sesion), any())).thenReturn(List.of(AccionOperarComo.INICIO));
    }

    private JwtService.TokenVerificado token(String actorEmail, Long actorId, String email, Long usuarioId) {
        return new JwtService.TokenVerificado(
                email, usuarioId, Optional.of(new JwtService.Actor(actorEmail, actorId)), sesion, vence);
    }

    private JwtService.TokenVerificado valido() {
        return token("admin@vitalys.test", 1L, "maria@vitalys.test", 7L);
    }

    @Test
    void sesionValida_autenticaAlSocioConElAdminComoOperador() {
        OperarComoAuthentication auth = autenticador.autenticar(valido()).orElseThrow();

        assertThat(auth.getPrincipal()).isSameAs(socio);
        assertThat(auth.getOperador()).isSameAs(admin);
        assertThat(auth.getSesionId()).isEqualTo(sesion);
        assertThat(auth.getExpiraEn()).isEqualTo(vence);
        assertThat(auth.isAuthenticated()).isTrue();
        assertThat(auth.getCredentials()).isNull();
    }

    @Test
    void operadorDeshabilitado_noAutentica() {
        admin.setActivo(false);
        assertThat(autenticador.autenticar(valido())).isEmpty();
    }

    @Test
    void operadorQueYaNoEsAdmin_noAutentica() {
        admin.setRol(RolUsuario.SOCIO_PACIENTE);
        assertThat(autenticador.autenticar(valido())).isEmpty();
    }

    @Test
    void operadorInexistenteOConOtroId_noAutentica() {
        assertThat(autenticador.autenticar(token("nadie@vitalys.test", 1L, "maria@vitalys.test", 7L))).isEmpty();
        assertThat(autenticador.autenticar(token("admin@vitalys.test", 99L, "maria@vitalys.test", 7L))).isEmpty();
    }

    @Test
    void sujetoDeshabilitado_noAutentica() {
        socio.setActivo(false);
        assertThat(autenticador.autenticar(valido())).isEmpty();
    }

    @Test
    void sujetoQueNoEsSocio_noAutentica() {
        socio.setRol(RolUsuario.PROFESIONAL);
        assertThat(autenticador.autenticar(valido())).isEmpty();
        socio.setRol(RolUsuario.ADMIN);
        assertThat(autenticador.autenticar(valido())).isEmpty();
    }

    @Test
    void sujetoInexistenteOConOtroId_noAutentica() {
        assertThat(autenticador.autenticar(token("admin@vitalys.test", 1L, "otro@vitalys.test", 7L))).isEmpty();
        assertThat(autenticador.autenticar(token("admin@vitalys.test", 1L, "maria@vitalys.test", 8L))).isEmpty();
    }

    @Test
    void operadorYSujetoElMismoUsuario_noAutentica() {
        assertThat(autenticador.autenticar(token("admin@vitalys.test", 1L, "admin@vitalys.test", 1L))).isEmpty();
    }

    @Test
    void sujetoSinFichaOConFichaDadaDeBaja_noAutentica() {
        ficha.darDeBaja(LocalDate.of(2026, 1, 1));
        assertThat(autenticador.autenticar(valido())).isEmpty();
        when(personaRepository.findByUsuarioId(7L)).thenReturn(Optional.empty());
        assertThat(autenticador.autenticar(valido())).isEmpty();
    }

    @Test
    void sesionSinInicioOTerminada_noAutentica() {
        when(auditoriaRepository.accionesDeSesion(eq(sesion), any())).thenReturn(List.of());
        assertThat(autenticador.autenticar(valido())).isEmpty();
        when(auditoriaRepository.accionesDeSesion(eq(sesion), any()))
                .thenReturn(List.of(AccionOperarComo.INICIO, AccionOperarComo.FIN));
        assertThat(autenticador.autenticar(valido())).isEmpty();
    }
}
