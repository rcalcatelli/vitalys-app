package com.vitalys.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.vitalys.config.JwtProperties;
import com.vitalys.domain.RolUsuario;
import com.vitalys.domain.Usuario;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Date;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * PU-31: la credencial de "Operar como" lleva al socio en {@code sub}, al ADMIN en {@code act},
 * la sesión en {@code jti}, vence a los 30 minutos y cualquier variación de esa forma se rechaza
 * entera (nunca se la lee como un token normal del socio).
 */
class OperarComoTokenTest {

    private JwtProperties properties;
    private JwtService jwtService;
    private final Usuario socio = usuario(7L, "maria@vitalys.test", RolUsuario.SOCIO_PACIENTE);
    private final Usuario admin = usuario(1L, "laura@vitalys.test", RolUsuario.ADMIN);

    @BeforeEach
    void setUp() {
        properties = new JwtProperties();
        byte[] bytes = new byte[32];
        new SecureRandom().nextBytes(bytes);
        properties.setSecret(Base64.getEncoder().encodeToString(bytes));
        properties.setExpirationMs(86_400_000L);
        jwtService = new JwtService(properties, Clock.systemUTC());
    }

    private static Usuario usuario(Long id, String email, RolUsuario rol) {
        Usuario u = new Usuario(email, "hash", rol);
        u.setId(id);
        return u;
    }

    private String firmar(io.jsonwebtoken.JwtBuilder builder) {
        return builder.signWith(Keys.hmacShaKeyFor(properties.getSecret().getBytes(StandardCharsets.UTF_8))).compact();
    }

    @Test
    void pu31_claimsDeLaCredencial() {
        UUID sesion = UUID.randomUUID();
        Instant antes = Instant.now();

        JwtService.TokenOperarComo emitido = jwtService.generarOperarComo(socio, admin, sesion);
        JwtService.TokenVerificado v = jwtService.verificar(emitido.token());

        assertThat(v.esOperarComo()).isTrue();
        assertThat(v.email()).isEqualTo("maria@vitalys.test");
        assertThat(v.usuarioId()).isEqualTo(7L);
        assertThat(v.actor()).contains(new JwtService.Actor("laura@vitalys.test", 1L));
        assertThat(v.sesionId()).isEqualTo(sesion);
        assertThat(emitido.sesionId()).isEqualTo(sesion);
        assertThat(jwtService.extraerRol(emitido.token())).isEqualTo("SOCIO_PACIENTE");
        // 30 minutos, con la precisión de segundos del JWT
        assertThat(Duration.between(antes, v.expiraEn()).toSeconds()).isBetween(1_798L, 1_800L);
        assertThat(emitido.expiraEn().getEpochSecond()).isEqualTo(v.expiraEn().getEpochSecond());
    }

    @Test
    void pu31_tokenNormal_sinActorNiSesion() {
        JwtService.TokenVerificado v = jwtService.verificar(jwtService.generarToken(admin));

        assertThat(v.esOperarComo()).isFalse();
        assertThat(v.actor()).isEmpty();
        assertThat(v.sesionId()).isNull();
        assertThat(v.email()).isEqualTo("laura@vitalys.test");
        assertThat(v.usuarioId()).isEqualTo(1L);
    }

    @Test
    void pu31_vencida_seRechaza() {
        properties.setOperarComoExpirationMs(-1_000L);
        String token = jwtService.generarOperarComo(socio, admin, UUID.randomUUID()).token();

        assertThatThrownBy(() -> jwtService.verificar(token)).isInstanceOf(ExpiredJwtException.class);
        assertThat(jwtService.esValido(token)).isFalse();
    }

    @Test
    void pu31_masLargaQueLaConfigurada_seRechaza() {
        Date ahora = new Date();
        String token = firmar(Jwts.builder()
                .subject("maria@vitalys.test")
                .claim("usuarioId", 7L)
                .claim(JwtService.CLAIM_ACTOR, Map.of("sub", "laura@vitalys.test", "usuarioId", 1L))
                .id(UUID.randomUUID().toString())
                .issuedAt(ahora)
                .expiration(new Date(ahora.getTime() + 24 * 3_600_000L)));

        assertThatThrownBy(() -> jwtService.verificar(token)).isInstanceOf(JwtException.class);
    }

    @Test
    void pu31_actorMalformado_seRechazaEnVezDeLeerseComoTokenDelSocio() {
        Date ahora = new Date();
        Date vence = new Date(ahora.getTime() + 60_000L);
        String actTexto = firmar(Jwts.builder().subject("maria@vitalys.test").claim("usuarioId", 7L)
                .claim(JwtService.CLAIM_ACTOR, "laura@vitalys.test").id(UUID.randomUUID().toString())
                .issuedAt(ahora).expiration(vence));
        String actSinId = firmar(Jwts.builder().subject("maria@vitalys.test").claim("usuarioId", 7L)
                .claim(JwtService.CLAIM_ACTOR, Map.of("sub", "laura@vitalys.test")).id(UUID.randomUUID().toString())
                .issuedAt(ahora).expiration(vence));
        String actSubVacio = firmar(Jwts.builder().subject("maria@vitalys.test").claim("usuarioId", 7L)
                .claim(JwtService.CLAIM_ACTOR, Map.of("sub", " ", "usuarioId", 1L)).id(UUID.randomUUID().toString())
                .issuedAt(ahora).expiration(vence));
        String sinJti = firmar(Jwts.builder().subject("maria@vitalys.test").claim("usuarioId", 7L)
                .claim(JwtService.CLAIM_ACTOR, Map.of("sub", "laura@vitalys.test", "usuarioId", 1L))
                .issuedAt(ahora).expiration(vence));
        String jtiNoUuid = firmar(Jwts.builder().subject("maria@vitalys.test").claim("usuarioId", 7L)
                .claim(JwtService.CLAIM_ACTOR, Map.of("sub", "laura@vitalys.test", "usuarioId", 1L)).id("123")
                .issuedAt(ahora).expiration(vence));
        String sinUsuarioId = firmar(Jwts.builder().subject("maria@vitalys.test")
                .claim(JwtService.CLAIM_ACTOR, Map.of("sub", "laura@vitalys.test", "usuarioId", 1L))
                .id(UUID.randomUUID().toString()).issuedAt(ahora).expiration(vence));
        String sinEmision = firmar(Jwts.builder().subject("maria@vitalys.test").claim("usuarioId", 7L)
                .claim(JwtService.CLAIM_ACTOR, Map.of("sub", "laura@vitalys.test", "usuarioId", 1L))
                .id(UUID.randomUUID().toString()).expiration(vence));

        for (String token : new String[] {actTexto, actSinId, actSubVacio, sinJti, jtiNoUuid, sinUsuarioId, sinEmision}) {
            assertThatThrownBy(() -> jwtService.verificar(token)).isInstanceOf(JwtException.class);
        }
    }

    @Test
    void tokenSinSub_seRechaza() {
        String token = firmar(Jwts.builder().claim("usuarioId", 7L).issuedAt(new Date()).expiration(new Date(System.currentTimeMillis() + 60_000L)));

        assertThatThrownBy(() -> jwtService.verificar(token)).isInstanceOf(JwtException.class);
    }

    @Test
    void firmadaConOtraClave_seRechaza() {
        JwtProperties otras = new JwtProperties();
        byte[] bytes = new byte[32];
        new SecureRandom().nextBytes(bytes);
        otras.setSecret(Base64.getEncoder().encodeToString(bytes));
        String ajeno = new JwtService(otras, Clock.systemUTC()).generarOperarComo(socio, admin, UUID.randomUUID()).token();

        assertThatThrownBy(() -> jwtService.verificar(ajeno)).isInstanceOf(JwtException.class);
    }
}
