package com.vitalys.service;

import com.vitalys.domain.RolUsuario;
import com.vitalys.domain.Usuario;
import com.vitalys.dto.LoginRequest;
import com.vitalys.dto.LoginResponse;
import com.vitalys.dto.MeResponse;
import com.vitalys.dto.RegistroRequest;
import com.vitalys.exception.CredencialesInvalidasException;
import com.vitalys.exception.EmailDuplicadoException;
import com.vitalys.exception.RolNoPermitidoException;
import com.vitalys.repository.UsuarioRepository;
import com.vitalys.security.JwtService;
import java.util.Optional;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Reglas de negocio de autenticación (design.md §4). El rol NUNCA es un input: se fuerza acá a
 * {@link RolUsuario#SOCIO_PACIENTE} en todo registro público (RF-01/RNF-03).
 */
@Service
public class AuthService {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(UsuarioRepository usuarioRepository, PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @Transactional
    public LoginResponse registrar(RegistroRequest request) {
        if (request.tieneCampoRol()) {
            throw new RolNoPermitidoException("El campo rol no es válido en el registro público");
        }

        String passwordHash = passwordEncoder.encode(request.getContrasena());
        Usuario usuario = new Usuario(request.getEmail(), passwordHash, RolUsuario.SOCIO_PACIENTE);

        try {
            usuario = usuarioRepository.saveAndFlush(usuario);
        } catch (DataIntegrityViolationException ex) {
            throw new EmailDuplicadoException("El email ya está registrado");
        }

        String token = jwtService.generarToken(usuario);
        return new LoginResponse(token, usuario.getId(), usuario.getRol());
    }

    public LoginResponse login(LoginRequest request) {
        String identificador = request.getIdentificador();

        // Criterio de distinción (RF-36): si contiene "@" es email, si no es DNI. Es el criterio
        // más simple posible porque los DNI argentinos no llevan arroba y el formato de email lo
        // exige. El DNI se busca en `personas.dni` vía consulta nativa (no existe entidad
        // `Persona` en este sprint) y por eso el login por DNI SOLO funciona para quien ya tiene
        // ficha cargada ahí: un usuario recién autorregistrado (CA-01-6: "la ficha queda
        // pendiente de completar por el ADMIN") o un PROFESIONAL (no tiene DNI en el esquema) no
        // tienen fila en `personas` y deben ingresar con email.
        Optional<Usuario> usuarioEncontrado = identificador.contains("@")
                ? usuarioRepository.findByEmail(identificador)
                : usuarioRepository.findByPersonaDni(identificador);

        Usuario usuario =
                usuarioEncontrado.orElseThrow(() -> new CredencialesInvalidasException("Credenciales inválidas"));

        if (!passwordEncoder.matches(request.getContrasena(), usuario.getPasswordHash())) {
            throw new CredencialesInvalidasException("Credenciales inválidas");
        }

        // Cuenta deshabilitada (usuarios.activo = FALSE, "soft-disable" según el esquema).
        // Se usa isEnabled() del contrato UserDetails para que la definición de "habilitado"
        // viva en un solo lugar. El 401 y el mensaje son IDÉNTICOS a los de contraseña
        // incorrecta a propósito: un error distinto permitiría averiguar qué emails existen
        // y cuáles están dados de baja.
        if (!usuario.isEnabled()) {
            throw new CredencialesInvalidasException("Credenciales inválidas");
        }

        String token = jwtService.generarToken(usuario);
        return new LoginResponse(token, usuario.getId(), usuario.getRol());
    }

    public MeResponse me(String email) {
        Usuario usuario = usuarioRepository
                .findByEmail(email)
                .orElseThrow(() -> new CredencialesInvalidasException("Usuario no encontrado"));

        return new MeResponse(usuario.getId(), usuario.getEmail(), usuario.getRol());
    }
}
