package com.vitalys.controller;

import com.vitalys.dto.ErrorResponse;
import com.vitalys.dto.LoginRequest;
import com.vitalys.dto.LoginResponse;
import com.vitalys.dto.MeResponse;
import com.vitalys.dto.RegistroRequest;
import com.vitalys.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Solo delega a {@link AuthService} — sin lógica de negocio acá (RNF-06).
 */
@RestController
@RequestMapping("/api/auth")
@Tag(name = "Autenticación", description = "Registro, login y datos del usuario autenticado (Módulo 1, docs/02-diseno/modulos.md)")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/registro")
    @Operation(
            summary = "Registrar un nuevo usuario",
            description = "Crea un usuario con rol forzado a SOCIO_PACIENTE. El rol nunca lo elige el cliente: "
                    + "si el body incluye la clave \"rol\", la petición se rechaza con 400 (RF-01, CA-01-7).")
    @ApiResponses({
        @ApiResponse(
                responseCode = "201",
                description = "Usuario creado, devuelve el JWT",
                content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = LoginResponse.class))),
        @ApiResponse(
                responseCode = "400",
                description = "Body inválido: incluye \"rol\", contraseña con menos de 8 caracteres o email con formato inválido",
                content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = ErrorResponse.class))),
        @ApiResponse(
                responseCode = "409",
                description = "El email ya está registrado",
                content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = ErrorResponse.class)))
    })
    public ResponseEntity<LoginResponse> registro(@Valid @RequestBody RegistroRequest request) {
        LoginResponse response = authService.registrar(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/login")
    @Operation(summary = "Iniciar sesión", description = "Valida credenciales y devuelve un JWT (HS256, TTL 24h).")
    @ApiResponses({
        @ApiResponse(
                responseCode = "200",
                description = "Credenciales válidas, devuelve el JWT",
                content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = LoginResponse.class))),
        @ApiResponse(
                responseCode = "401",
                description = "Credenciales inválidas O cuenta deshabilitada — mismo mensaje a propósito, "
                        + "para no revelar qué emails existen",
                content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = ErrorResponse.class)))
    })
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @GetMapping("/me")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Datos del usuario autenticado", description = "Nunca expone password_hash.")
    @ApiResponses({
        @ApiResponse(
                responseCode = "200",
                description = "Datos del usuario",
                content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = MeResponse.class))),
        @ApiResponse(
                responseCode = "401",
                description = "Sin token o token inválido/expirado",
                content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = ErrorResponse.class)))
    })
    public ResponseEntity<MeResponse> me(Authentication authentication) {
        return ResponseEntity.ok(authService.me(authentication.getName()));
    }
}
