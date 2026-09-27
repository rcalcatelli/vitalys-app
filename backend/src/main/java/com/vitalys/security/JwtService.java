package com.vitalys.security;

import com.vitalys.config.JwtProperties;
import com.vitalys.domain.Usuario;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import javax.crypto.SecretKey;
import org.springframework.stereotype.Service;

/**
 * Firma y valida JWT HS256 (design.md §3). Claims: {@code sub} (email), {@code rol},
 * {@code usuarioId}, {@code iat}, {@code exp} (+24h por defecto, configurable vía
 * {@code JWT_EXPIRATION_MS}). Sin blacklist server-side (Decisión 9/RNF-10) — el único mecanismo
 * de expiración es el TTL del token.
 */
@Service
public class JwtService {

    private final JwtProperties jwtProperties;

    public JwtService(JwtProperties jwtProperties) {
        this.jwtProperties = jwtProperties;
    }

    public String generarToken(Usuario usuario) {
        Date ahora = new Date();
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
