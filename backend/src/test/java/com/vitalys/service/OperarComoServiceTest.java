package com.vitalys.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.vitalys.domain.Persona;
import com.vitalys.domain.RolUsuario;
import com.vitalys.domain.Usuario;
import com.vitalys.dto.OperarComoResponse;
import com.vitalys.exception.AccesoDenegadoException;
import com.vitalys.exception.RecursoNoEncontradoException;
import com.vitalys.exception.ReglaDeNegocioException;
import com.vitalys.repository.PersonaRepository;
import com.vitalys.security.ActorActual;
import com.vitalys.security.JwtService;
import com.vitalys.security.OperarComoAuthentication;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.core.context.SecurityContextHolder;

/** RF-39, RN-26 (PI-112..PI-116, PI-123 a nivel servicio). */
class OperarComoServiceTest {

    private PersonaRepository personaRepository;
    private JwtService jwtService;
    private AuditoriaOperarComoService auditoria;
    private OperarComoService service;

    private Usuario admin;
    private Usuario socio;
    private Persona ficha;

    @BeforeEach
    void setUp() {
        personaRepository = mock(PersonaRepository.class);
        jwtService = mock(JwtService.class);
        auditoria = mock(AuditoriaOperarComoService.class);
        service = new OperarComoService(personaRepository, jwtService, new ActorActual(), auditoria);

        admin = usuario(1L, RolUsuario.ADMIN);
        socio = usuario(7L, RolUsuario.SOCIO_PACIENTE);
        ficha = new Persona(socio, LocalDate.of(2024, 1, 1));
        ficha.setId(20L);
        ficha.setNombre("María");
        ficha.setApellido("Pérez");
        when(personaRepository.findById(20L)).thenReturn(Optional.of(ficha));
        when(personaRepository.findByUsuarioId(7L)).thenReturn(Optional.of(ficha));
        when(jwtService.generarOperarComo(eq(socio), eq(admin), any(UUID.class))).thenAnswer(inv -> new JwtService.TokenOperarComo(
                "credencial", inv.getArgument(2), Instant.parse("2026-10-20T12:30:00Z")));
    }

    @AfterEach
    void limpiar() {
        SecurityContextHolder.clearContext();
    }

    private static Usuario usuario(Long id, RolUsuario rol) {
        Usuario u = new Usuario("u" + id + "@vitalys.test", "hash", rol);
        u.setId(id);
        return u;
    }

    @Test
    void pi112_adminIniciaSobreUnSocio_emiteYAuditaLaMismaSesion() {
        OperarComoResponse r = service.iniciar(admin, 20L);

        assertThat(r.token()).isEqualTo("credencial");
        assertThat(r.expiraEn().toInstant()).isEqualTo(Instant.parse("2026-10-20T12:30:00Z"));
        assertThat(r.expiraEn().getOffset().getTotalSeconds()).isEqualTo(-3 * 3600);
        assertThat(r.persona()).isEqualTo(new OperarComoResponse.PersonaResumen(20L, "María", "Pérez"));
        ArgumentCaptor<UUID> auditada = ArgumentCaptor.forClass(UUID.class);
        verify(auditoria).registrarInicio(auditada.capture(), eq(1L), eq(7L), eq(20L));
        ArgumentCaptor<UUID> firmada = ArgumentCaptor.forClass(UUID.class);
        verify(jwtService).generarOperarComo(eq(socio), eq(admin), firmada.capture());
        assertThat(firmada.getValue()).isEqualTo(auditada.getValue());
    }

    @Test
    void pi113_unRolNoAdminNoInicia() {
        assertThatThrownBy(() -> service.iniciar(socio, 20L)).isInstanceOf(AccesoDenegadoException.class);
        assertThatThrownBy(() -> service.iniciar(usuario(4L, RolUsuario.PROFESIONAL), 20L))
                .isInstanceOf(AccesoDenegadoException.class);
        verifyNoInteractions(jwtService, auditoria);
    }

    @Test
    void pi114_sujetoAdminOProfesional_403() {
        socio.setRol(RolUsuario.ADMIN);
        assertThatThrownBy(() -> service.iniciar(admin, 20L))
                .isInstanceOf(AccesoDenegadoException.class)
                .hasMessageContaining("socio");
        socio.setRol(RolUsuario.PROFESIONAL);
        assertThatThrownBy(() -> service.iniciar(admin, 20L)).isInstanceOf(AccesoDenegadoException.class);
        verifyNoInteractions(jwtService, auditoria);
    }

    @Test
    void sobreSuPropiaFicha_403() {
        Persona propia = new Persona(admin, LocalDate.of(2024, 1, 1));
        when(personaRepository.findById(30L)).thenReturn(Optional.of(propia));

        assertThatThrownBy(() -> service.iniciar(admin, 30L)).isInstanceOf(AccesoDenegadoException.class);
    }

    @Test
    void pi115_inexistenteDadoDeBajaODeshabilitado() {
        assertThatThrownBy(() -> service.iniciar(admin, 99L)).isInstanceOf(RecursoNoEncontradoException.class);

        ficha.darDeBaja(LocalDate.of(2026, 1, 1));
        assertThatThrownBy(() -> service.iniciar(admin, 20L))
                .isInstanceOf(ReglaDeNegocioException.class)
                .hasMessageContaining("baja");

        ficha.reactivar();
        socio.setActivo(false);
        assertThatThrownBy(() -> service.iniciar(admin, 20L))
                .isInstanceOf(ReglaDeNegocioException.class)
                .hasMessageContaining("deshabilitado");
        verifyNoInteractions(jwtService, auditoria);
    }

    @Test
    void pi116_desdeUnaSesionDeOperarComo_noSeAnidaNiSeRenueva() {
        // Aunque el actor que llegara al servicio fuera un ADMIN, la sesión en curso lo frena.
        SecurityContextHolder.getContext()
                .setAuthentication(new OperarComoAuthentication(socio, admin, UUID.randomUUID(), Instant.now()));

        assertThatThrownBy(() -> service.iniciar(admin, 20L))
                .isInstanceOf(AccesoDenegadoException.class)
                .hasMessageContaining("otra sesión");
        verifyNoInteractions(jwtService, auditoria);
    }

    @Test
    void pi123_terminar_auditaElFinDeLaSesionEnCurso() {
        OperarComoAuthentication sesion = new OperarComoAuthentication(socio, admin, UUID.randomUUID(), Instant.now());
        SecurityContextHolder.getContext().setAuthentication(sesion);

        service.terminar();

        verify(auditoria).registrarFin(sesion, 20L);
    }

    @Test
    void terminar_sinSesionDeOperarComo_422() {
        assertThatThrownBy(() -> service.terminar()).isInstanceOf(ReglaDeNegocioException.class);
        verifyNoInteractions(auditoria);
    }

    @Test
    void terminar_socioSinFicha_404() {
        SecurityContextHolder.getContext()
                .setAuthentication(new OperarComoAuthentication(socio, admin, UUID.randomUUID(), Instant.now()));
        when(personaRepository.findByUsuarioId(7L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.terminar()).isInstanceOf(RecursoNoEncontradoException.class);
    }
}
