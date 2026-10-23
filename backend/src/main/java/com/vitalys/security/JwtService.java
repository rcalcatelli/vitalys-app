package com.vitalys.security;

import com.vitalys.config.JwtProperties;
import com.vitalys.domain.Usuario;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.util.Date;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import javax.crypto.SecretKey;
import org.springframework.stereotype.Service;

/**
 * Firma y valida JWT HS256 (design.md §3). Claims: {@code sub} (email), {@code rol},
 * {@code usuarioId}, {@code iat}, {@code exp} (+24h por defecto, configurable vía
 * {@code JWT_EXPIRATION_MS}). Sin blacklist server-side (Decisión 9/RNF-10) — el único mecanismo
 * de expiración es el TTL del token.
 *
 * <p><b>"Operar como" (RN-26).</b> La credencial con la que Recepción opera en nombre de un socio
 * lleva como {@code sub} al socio y, en el claim {@code act} (RFC 8693), al ADMIN que opera:
 * {@code act = {sub: email del ADMIN, usuarioId}}. Además lleva {@code jti} (la sesión que se
 * audita) y vence a los 30 minutos. No hay endpoint de renovación: la única forma de obtener otra
 * es iniciar una sesión nueva desde la sesión normal del ADMIN.
 */
@Service
public class JwtService {

    static final String CLAIM_ACTOR = "act";

    private final JwtProperties jwtProperties;
    private final Clock clock;

    public JwtService(JwtProperties jwtProperties, Clock clock) {
        this.jwtProperties = jwtProperties;
        this.clock = clock;
    }

    /** El ADMIN que opera detrás de una credencial de "Operar como". */
    public record Actor(String email, Long usuarioId) {}

    /**
     * Resultado de verificar firma, vencimiento y forma de un token. {@code actor} y
     * {@code sesionId} solo están presentes en una credencial de "Operar como".
     */
    public record TokenVerificado(String email, Long usuarioId, Optional<Actor> actor, UUID sesionId, Instant expiraEn) {

        public boolean esOperarComo() {
            return actor.isPresent();
        }
    }

    /** Credencial de "Operar como" recién emitida. */
    public record TokenOperarComo(String token, UUID sesionId, Instant expiraEn) {}

    public String generarToken(Usuario usuario) {
        Date ahora = Date.from(clock.instant());
        Date expiracion = new Date(ahora.getTime() + jwtProperties.getExpirationMs());

        return Jwts.builder()
                .subject(usuario.getEmail())
                .claim("rol", usuario.getRol().name())
                .claim("usuarioId", usuario.getId())
                .issuedAt(ahora)
                .expiration(expiracion)
                .signWith(claveFirma())
                .compact();
    }

    /**
     * Emite la credencial de "Operar como": {@code sub} = socio, {@code act} = ADMIN, {@code jti}
     * = sesión, vence a los {@code vitalys.jwt.operar-como-expiration-ms} (30 min).
     */
    public TokenOperarComo generarOperarComo(Usuario sujeto, Usuario operador, UUID sesionId) {
        Date ahora = Date.from(clock.instant());
        Date expiracion = new Date(ahora.getTime() + jwtProperties.getOperarComoExpirationMs());

        String token = Jwts.builder()
                .subject(sujeto.getEmail())
                .claim("rol", sujeto.getRol().name())
                .claim("usuarioId", sujeto.getId())
                .claim(CLAIM_ACTOR, Map.of("sub", operador.getEmail(), "usuarioId", operador.getId()))
                .id(sesionId.toString())
                .issuedAt(ahora)
                .expiration(expiracion)
                .signWith(claveFirma())
                .compact();
        return new TokenOperarComo(token, sesionId, expiracion.toInstant());
    }

    /**
     * Verifica firma y vencimiento y lee la identidad del token. Una credencial con {@code act}
     * que no tenga exactamente la forma que emite {@link #generarOperarComo} se rechaza entera:
     * NUNCA se degrada a un token normal del socio, porque eso le daría al portador una sesión
     * del socio sin auditoría.
     *
     * @throws JwtException si el token es inválido, vencido o malformado
     */
    public TokenVerificado verificar(String token) {
        Claims claims = parsearClaims(token);
        String email = claims.getSubject();
        if (email == null || email.isBlank()) {
            throw new MalformedJwtException("Token sin sub");
        }
        Instant expiraEn = claims.getExpiration() == null ? null : claims.getExpiration().toInstant();
        Object act = claims.get(CLAIM_ACTOR);
        if (act == null) {
            return new TokenVerificado(email, comoLong(claims.get("usuarioId")), Optional.empty(), null, expiraEn);
        }

        if (!(act instanceof Map<?, ?> actor)
                || !(actor.get("sub") instanceof String actorEmail)
                || actorEmail.isBlank()
                || !(actor.get("usuarioId") instanceof Number actorId)) {
            throw new MalformedJwtException("Claim act inválido");
        }
        Long usuarioId = comoLong(claims.get("usuarioId"));
        if (usuarioId == null) {
            throw new MalformedJwtException("Credencial de Operar como sin usuarioId");
        }
        UUID sesionId;
        try {
            sesionId = UUID.fromString(String.valueOf(claims.getId()));
        } catch (IllegalArgumentException ex) {
            throw new MalformedJwtException("Credencial de Operar como sin jti válido");
        }
        // Defensa ante un token de "Operar como" con una vida mayor que la configurada: no es
        // renovable ni extensible, aunque alguien consiga firmarlo con otra duración.
        Date emitido = claims.getIssuedAt();
        if (emitido == null
                || claims.getExpiration() == null
                || claims.getExpiration().getTime() - emitido.getTime() > jwtProperties.getOperarComoExpirationMs()) {
            throw new MalformedJwtException("Credencial de Operar como con vigencia inválida");
        }
        return new TokenVerificado(
                email, usuarioId, Optional.of(new Actor(actorEmail, actorId.longValue())), sesionId, expiraEn);
    }

    public String extraerEmail(String token) {
        return parsearClaims(token).getSubject();
    }

    public String extraerRol(String token) {
        return parsearClaims(token).get("rol", String.class);
    }

    public boolean esValido(String token) {
        try {
            parsearClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException ex) {
            return false;
        }
    }

    private static Long comoLong(Object valor) {
        return valor instanceof Number n ? n.longValue() : null;
    }

    private Claims parsearClaims(String token) {
        return Jwts.parser()
                .verifyWith(claveFirma())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    private SecretKey claveFirma() {
        return Keys.hmacShaKeyFor(jwtProperties.getSecret().getBytes(StandardCharsets.UTF_8));
    }
}
