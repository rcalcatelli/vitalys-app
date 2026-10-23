package com.vitalys.security;

import com.vitalys.domain.Usuario;
import java.time.Instant;
import java.util.UUID;
import org.springframework.security.authentication.AbstractAuthenticationToken;

/**
 * Autenticación de una sesión de "Operar como" (design.md D5). El principal es el SOCIO sujeto y
 * las autoridades son las suyas: todo chequeo de rol existente (la regla {@code /api/admin/**} y
 * los {@code esAdmin(actor)} de los servicios) trata la sesión como al socio, sin que ningún
 * servicio tenga que acordarse de nada. El ADMIN que opera queda aparte, en {@link #getOperador()},
 * para auditar y para guardar quién hizo cada escritura (D8).
 */
public class OperarComoAuthentication extends AbstractAuthenticationToken {

    private final Usuario sujeto;
    private final Usuario operador;
    private final UUID sesionId;
    private final Instant expiraEn;

    public OperarComoAuthentication(Usuario sujeto, Usuario operador, UUID sesionId, Instant expiraEn) {
        super(sujeto.getAuthorities());
        this.sujeto = sujeto;
        this.operador = operador;
        this.sesionId = sesionId;
        this.expiraEn = expiraEn;
        setAuthenticated(true);
    }

    @Override
    public Object getCredentials() {
        return null;
    }

    /** El socio en cuyo nombre se opera. */
    @Override
    public Usuario getPrincipal() {
        return sujeto;
    }

    public Usuario getOperador() {
        return operador;
    }

    public UUID getSesionId() {
        return sesionId;
    }

    public Instant getExpiraEn() {
        return expiraEn;
    }
}
