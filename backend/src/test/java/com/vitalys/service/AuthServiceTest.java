package com.vitalys.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.vitalys.domain.RolUsuario;
import com.vitalys.domain.Usuario;
import com.vitalys.dto.LoginRequest;
import com.vitalys.dto.LoginResponse;
import com.vitalys.dto.MeResponse;
import com.vitalys.dto.RegistroRequest;
import com.vitalys.exception.CredencialesInvalidasException;
import com.vitalys.exception.EmailDuplicadoException;
import com.vitalys.exception.RolNoPermitidoException;
import com.vitalys.repository.PersonaRepository;
import com.vitalys.repository.ProfesionalRepository;
import com.vitalys.repository.UsuarioRepository;
import com.vitalys.security.ActorActual;
import com.vitalys.security.JwtService;
import com.vitalys.security.OperarComoAuthentication;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.springframework.security.core.context.SecurityContextHolder;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;

class AuthServiceTest {

    private UsuarioRepository usuarioRepository;
    private PasswordEncoder passwordEncoder;
    private JwtService jwtService;
    private AuthService authService;
    private PersonaRepository personaRepository;
    private ProfesionalRepository profesionalRepository;
    private final ActorActual actorActual = new ActorActual();

    @BeforeEach
    void setUp() {
        usuarioRepository = mock(UsuarioRepository.class);
        passwordEncoder = mock(PasswordEncoder.class);
        jwtService = mock(JwtService.class);
        personaRepository = mock(PersonaRepository.class);
        profesionalRepository = mock(ProfesionalRepository.class);
        authService = new AuthService(
                usuarioRepository, passwordEncoder, jwtService, personaRepository, profesionalRepository, actorActual);
    }

    private RegistroRequest registroRequest(String email, String contrasena) {
        RegistroRequest request = new RegistroRequest();
        request.setEmail(email);
        request.setContrasena(contrasena);
        return request;
    }

    @Test
    void registrar_conBodyValido_fuerzaRolSocioPacienteYDevuelveToken() {
        RegistroRequest request = registroRequest("nuevo@vitalys.test", "password123");
        when(passwordEncoder.encode("password123")).thenReturn("hash-bcrypt");
        when(usuarioRepository.saveAndFlush(any(Usuario.class))).thenAnswer(invocation -> {
            Usuario u = invocation.getArgument(0);
            u.setId(1L);
            return u;
        });
        when(jwtService.generarToken(any(Usuario.class))).thenReturn("jwt-token");

        LoginResponse response = authService.registrar(request);

        assertThat(response.getToken()).isEqualTo("jwt-token");
        assertThat(response.getRol()).isEqualTo(RolUsuario.SOCIO_PACIENTE);
        assertThat(response.getUsuarioId()).isEqualTo(1L);
    }

    @Test
    void registrar_conRolEnElBody_lanzaRolNoPermitidoExceptionYNoPersiste() {
        RegistroRequest request = registroRequest("nuevo@vitalys.test", "password123");
        request.setExtra("rol", "ADMIN");

        assertThatThrownBy(() -> authService.registrar(request)).isInstanceOf(RolNoPermitidoException.class);

        verify(usuarioRepository, never()).saveAndFlush(any(Usuario.class));
    }

    @Test
    void registrar_conEmailDuplicado_lanzaEmailDuplicadoException() {
        RegistroRequest request = registroRequest("dup@vitalys.test", "password123");
        when(passwordEncoder.encode(anyString())).thenReturn("hash-bcrypt");
        when(usuarioRepository.saveAndFlush(any(Usuario.class)))
                .thenThrow(new DataIntegrityViolationException("duplicate key"));

        assertThatThrownBy(() -> authService.registrar(request)).isInstanceOf(EmailDuplicadoException.class);
    }

    @Test
    void login_conCredencialesValidas_devuelveToken() {
        Usuario usuario = new Usuario("user@vitalys.test", "hash-bcrypt", RolUsuario.SOCIO_PACIENTE);
        usuario.setId(5L);
        when(usuarioRepository.findByEmail("user@vitalys.test")).thenReturn(Optional.of(usuario));
        when(passwordEncoder.matches("password123", "hash-bcrypt")).thenReturn(true);
        when(jwtService.generarToken(usuario)).thenReturn("jwt-token");

        LoginRequest request = new LoginRequest();
        request.setIdentificador("user@vitalys.test");
        request.setContrasena("password123");

        LoginResponse response = authService.login(request);

        assertThat(response.getToken()).isEqualTo("jwt-token");
    }

    @Test
    void login_conContrasenaIncorrecta_lanzaCredencialesInvalidasException() {
        Usuario usuario = new Usuario("user@vitalys.test", "hash-bcrypt", RolUsuario.SOCIO_PACIENTE);
        when(usuarioRepository.findByEmail("user@vitalys.test")).thenReturn(Optional.of(usuario));
        when(passwordEncoder.matches("incorrecta", "hash-bcrypt")).thenReturn(false);

        LoginRequest request = new LoginRequest();
        request.setIdentificador("user@vitalys.test");
        request.setContrasena("incorrecta");

        assertThatThrownBy(() -> authService.login(request)).isInstanceOf(CredencialesInvalidasException.class);
    }

    @Test
    void login_conCuentaDeshabilitada_lanzaCredencialesInvalidasYNoEmiteToken() {
        Usuario usuario = new Usuario("baja@vitalys.test", "hash-bcrypt", RolUsuario.SOCIO_PACIENTE);
        usuario.setActivo(false); // usuarios.activo = FALSE: baja lógica de la cuenta
        when(usuarioRepository.findByEmail("baja@vitalys.test")).thenReturn(Optional.of(usuario));
        when(passwordEncoder.matches("password123", "hash-bcrypt")).thenReturn(true);

        LoginRequest request = new LoginRequest();
        request.setIdentificador("baja@vitalys.test");
        request.setContrasena("password123");

        // La contraseña es CORRECTA: lo que debe frenar el login es la cuenta deshabilitada.
        assertThatThrownBy(() -> authService.login(request))
                .isInstanceOf(CredencialesInvalidasException.class)
                .hasMessage("Credenciales inválidas"); // mismo mensaje: no revela que la cuenta existe
        verifyNoInteractions(jwtService);
    }

    @Test
    void login_conEmailInexistente_lanzaCredencialesInvalidasException() {
        when(usuarioRepository.findByEmail("noexiste@vitalys.test")).thenReturn(Optional.empty());

        LoginRequest request = new LoginRequest();
        request.setIdentificador("noexiste@vitalys.test");
        request.setContrasena("cualquiera");

        assertThatThrownBy(() -> authService.login(request)).isInstanceOf(CredencialesInvalidasException.class);
    }

    @Test
    void login_conDniValidoYContrasenaCorrecta_devuelveToken() {
        // identificador sin "@" → se resuelve por DNI (personas.dni), no por email (RF-36).
        Usuario usuario = new Usuario("con-ficha@vitalys.test", "hash-bcrypt", RolUsuario.SOCIO_PACIENTE);
        usuario.setId(7L);
        when(usuarioRepository.findByPersonaDni("30111222")).thenReturn(Optional.of(usuario));
        when(passwordEncoder.matches("password123", "hash-bcrypt")).thenReturn(true);
        when(jwtService.generarToken(usuario)).thenReturn("jwt-token-dni");

        LoginRequest request = new LoginRequest();
        request.setIdentificador("30111222");
        request.setContrasena("password123");

        LoginResponse response = authService.login(request);

        assertThat(response.getToken()).isEqualTo("jwt-token-dni");
        verify(usuarioRepository, never()).findByEmail(anyString());
    }

    @Test
    void login_conDniDeUsuarioSinFichaEnPersonas_lanzaCredencialesInvalidasException() {
        // Usuario autorregistrado (CA-01-6) o PROFESIONAL: no tienen fila en `personas`, así que
        // la consulta nativa por DNI no encuentra nada, sin importar si el DNI "existe" en otro
        // lado del sistema.
        when(usuarioRepository.findByPersonaDni("40222333")).thenReturn(Optional.empty());

        LoginRequest request = new LoginRequest();
        request.setIdentificador("40222333");
        request.setContrasena("cualquiera");

        assertThatThrownBy(() -> authService.login(request)).isInstanceOf(CredencialesInvalidasException.class);
    }

    @Test
    void login_conDniInexistente_lanzaCredencialesInvalidasExceptionIndistinguibleDelAnterior() {
        when(usuarioRepository.findByPersonaDni("99999999")).thenReturn(Optional.empty());

        LoginRequest request = new LoginRequest();
        request.setIdentificador("99999999");
        request.setContrasena("cualquiera");

        assertThatThrownBy(() -> authService.login(request))
                .isInstanceOf(CredencialesInvalidasException.class)
                .hasMessage("Credenciales inválidas");
    }

    @Test
    void me_conEmailExistente_devuelveDatosSinPasswordHash() {
        Usuario usuario = new Usuario("user@vitalys.test", "hash-bcrypt", RolUsuario.ADMIN);
        usuario.setId(9L);
        when(usuarioRepository.findByEmail("user@vitalys.test")).thenReturn(Optional.of(usuario));

        MeResponse response = authService.me("user@vitalys.test");

        assertThat(response.getId()).isEqualTo(9L);
        assertThat(response.getEmail()).isEqualTo("user@vitalys.test");
        assertThat(response.getRol()).isEqualTo(RolUsuario.ADMIN);
    }

    @Test
    void me_deUnaPersona_traeNombreYApellidoDeLaFicha() {
        Usuario usuario = new Usuario("laura@vitalys.test", "hash", RolUsuario.ADMIN);
        usuario.setId(1L);
        com.vitalys.domain.Persona persona = new com.vitalys.domain.Persona(usuario, java.time.LocalDate.of(2024, 1, 1));
        persona.setNombre("Laura");
        persona.setApellido("Benítez");
        when(usuarioRepository.findByEmail("laura@vitalys.test")).thenReturn(Optional.of(usuario));
        when(personaRepository.findByUsuarioId(1L)).thenReturn(Optional.of(persona));

        MeResponse response = authService.me("laura@vitalys.test");

        assertThat(response.getNombre()).isEqualTo("Laura");
        assertThat(response.getApellido()).isEqualTo("Benítez");
        verifyNoInteractions(profesionalRepository);
    }

    @Test
    void me_deUnProfesional_traeNombreYApellidoDelProfesional() {
        Usuario usuario = new Usuario("vale@vitalys.test", "hash", RolUsuario.PROFESIONAL);
        usuario.setId(2L);
        com.vitalys.domain.Profesional profesional = new com.vitalys.domain.Profesional(usuario);
        profesional.setNombre("Valentina");
        profesional.setApellido("Méndez");
        when(usuarioRepository.findByEmail("vale@vitalys.test")).thenReturn(Optional.of(usuario));
        when(profesionalRepository.findByUsuarioId(2L)).thenReturn(Optional.of(profesional));

        MeResponse response = authService.me("vale@vitalys.test");

        assertThat(response.getNombre()).isEqualTo("Valentina");
        assertThat(response.getApellido()).isEqualTo("Méndez");
        verifyNoInteractions(personaRepository);
    }

    @Test
    void me_sinFicha_nombreYApellidoNulos() {
        Usuario usuario = new Usuario("nuevo@vitalys.test", "hash", RolUsuario.SOCIO_PACIENTE);
        usuario.setId(3L);
        when(usuarioRepository.findByEmail("nuevo@vitalys.test")).thenReturn(Optional.of(usuario));
        when(personaRepository.findByUsuarioId(3L)).thenReturn(Optional.empty());

        MeResponse response = authService.me("nuevo@vitalys.test");

        assertThat(response.getNombre()).isNull();
        assertThat(response.getApellido()).isNull();
    }

    @AfterEach
    void limpiarContexto() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void me_fueraDeOperarComo_sinOperador() {
        Usuario usuario = new Usuario("nuevo@vitalys.test", "hash", RolUsuario.SOCIO_PACIENTE);
        usuario.setId(3L);
        when(usuarioRepository.findByEmail("nuevo@vitalys.test")).thenReturn(Optional.of(usuario));

        MeResponse response = authService.me("nuevo@vitalys.test");

        assertThat(response.getOperadoPor()).isNull();
        assertThat(response.getOperarComoExpiraEn()).isNull();
    }

    @Test
    void me_enOperarComo_traeAlSocioYAlAdminQueOpera() {
        Usuario socio = new Usuario("maria@vitalys.test", "hash", RolUsuario.SOCIO_PACIENTE);
        socio.setId(7L);
        Usuario admin = new Usuario("laura@vitalys.test", "hash", RolUsuario.ADMIN);
        admin.setId(1L);
        com.vitalys.domain.Persona fichaAdmin = new com.vitalys.domain.Persona(admin, java.time.LocalDate.of(2024, 1, 1));
        fichaAdmin.setNombre("Laura");
        fichaAdmin.setApellido("Benítez");
        when(usuarioRepository.findByEmail("maria@vitalys.test")).thenReturn(Optional.of(socio));
        when(personaRepository.findByUsuarioId(7L)).thenReturn(Optional.empty());
        when(personaRepository.findByUsuarioId(1L)).thenReturn(Optional.of(fichaAdmin));
        Instant vence = Instant.parse("2026-10-20T12:30:00Z");
        SecurityContextHolder.getContext().setAuthentication(new OperarComoAuthentication(socio, admin, UUID.randomUUID(), vence));

        MeResponse response = authService.me("maria@vitalys.test");

        assertThat(response.getEmail()).isEqualTo("maria@vitalys.test");
        assertThat(response.getRol()).isEqualTo(RolUsuario.SOCIO_PACIENTE);
        assertThat(response.getOperadoPor()).isEqualTo(new MeResponse.Operador(1L, "Laura", "Benítez"));
        assertThat(response.getOperarComoExpiraEn().toInstant()).isEqualTo(vence);
    }

    @Test
    void me_enOperarComo_operadorSinFicha_soloElId() {
        Usuario socio = new Usuario("maria@vitalys.test", "hash", RolUsuario.SOCIO_PACIENTE);
        socio.setId(7L);
        Usuario admin = new Usuario("admin@vitalys.test", "hash", RolUsuario.ADMIN);
        admin.setId(1L);
        when(usuarioRepository.findByEmail("maria@vitalys.test")).thenReturn(Optional.of(socio));
        when(personaRepository.findByUsuarioId(any())).thenReturn(Optional.empty());
        SecurityContextHolder.getContext().setAuthentication(
                new OperarComoAuthentication(socio, admin, UUID.randomUUID(), Instant.now()));

        assertThat(authService.me("maria@vitalys.test").getOperadoPor()).isEqualTo(new MeResponse.Operador(1L, null, null));
    }
}
