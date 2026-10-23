package com.vitalys.security;

import com.vitalys.domain.AccionOperarComo;
import com.vitalys.domain.RolUsuario;
import com.vitalys.domain.Usuario;
import com.vitalys.repository.AuditoriaOperarComoRepository;
import com.vitalys.repository.PersonaRepository;
import com.vitalys.repository.UsuarioRepository;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * Revalida una credencial de "Operar como" en CADA request (RN-26). Firma y vencimiento ya los
 * verificó {@link JwtService}; acá se exige además, contra la base y en este momento:
 *
 * <ul>
 *   <li>que el operador exista con el mismo id del token, esté habilitado y siga siendo ADMIN;
 *   <li>que el sujeto exista con el mismo id del token, esté habilitado, sea SOCIO_PACIENTE y
 *       tenga ficha de persona activa;
 *   <li>que la sesión haya sido abierta por {@code POST /api/admin/operar-como} (fila INICIO) y no
 *       se haya terminado (sin fila FIN), y que la fila INICIO sea de ese mismo operador sobre ese
 *       mismo sujeto (no alcanza con que el id de sesión exista).
 * </ul>
 *
 * <p>Si algo falla, la request queda sin autenticar y el entry point responde 401. Nunca se cae a
 * autenticar al socio "a secas" con esa credencial.
 */
@Component
public class OperarComoAutenticador {

    private static final Logger log = LoggerFactory.getLogger(OperarComoAutenticador.class);
    private static final List<AccionOperarComo> CICLO_DE_VIDA = List.of(AccionOperarComo.INICIO, AccionOperarComo.FIN);

    private final UsuarioRepository usuarioRepository;
    private final PersonaRepository personaRepository;
    private final AuditoriaOperarComoRepository auditoriaRepository;

    public OperarComoAutenticador(
            UsuarioRepository usuarioRepository,
            PersonaRepository personaRepository,
            AuditoriaOperarComoRepository auditoriaRepository) {
        this.usuarioRepository = usuarioRepository;
        this.personaRepository = personaRepository;
        this.auditoriaRepository = auditoriaRepository;
    }

    public Optional<OperarComoAuthentication> autenticar(JwtService.TokenVerificado token) {
        JwtService.Actor actor = token.actor().orElseThrow();
        Optional<Usuario> operador = usuarioRepository.findByEmail(actor.email());
        if (operador.isEmpty()
                || !Objects.equals(operador.get().getId(), actor.usuarioId())
                || !operador.get().isEnabled()
                || operador.get().getRol() != RolUsuario.ADMIN) {
            return rechazar("el operador ya no es un ADMIN habilitado", token);
        }
        Optional<Usuario> sujeto = usuarioRepository.findByEmail(token.email());
        if (sujeto.isEmpty()
                || !Objects.equals(sujeto.get().getId(), token.usuarioId())
                || !sujeto.get().isEnabled()
                || sujeto.get().getRol() != RolUsuario.SOCIO_PACIENTE
                || Objects.equals(sujeto.get().getId(), operador.get().getId())) {
            return rechazar("el sujeto ya no es un socio habilitado", token);
        }
        boolean fichaActiva = personaRepository
                .findByUsuarioId(sujeto.get().getId())
                .map(p -> p.estaActiva())
                .orElse(false);
        if (!fichaActiva) {
            return rechazar("el sujeto no tiene ficha activa", token);
        }
        List<AccionOperarComo> marcas = auditoriaRepository.accionesDeSesion(token.sesionId(), CICLO_DE_VIDA);
        if (!marcas.contains(AccionOperarComo.INICIO) || marcas.contains(AccionOperarComo.FIN)) {
            return rechazar("la sesión no fue iniciada o ya terminó", token);
        }
        // El jti solo no alcanza: la fila INICIO tiene que ser de ESTE operador sobre ESTE sujeto.
        if (!auditoriaRepository.existsBySesionIdAndAccionAndOperadorUsuarioIdAndSujetoUsuarioId(
                token.sesionId(), AccionOperarComo.INICIO, operador.get().getId(), sujeto.get().getId())) {
            return rechazar("la sesión fue iniciada por otro operador o sobre otro sujeto", token);
        }
        return Optional.of(new OperarComoAuthentication(sujeto.get(), operador.get(), token.sesionId(), token.expiraEn()));
    }

    private static Optional<OperarComoAuthentication> rechazar(String motivo, JwtService.TokenVerificado token) {
        log.warn("Credencial de Operar como rechazada (sesión {}): {}", token.sesionId(), motivo);
        return Optional.empty();
    }
}
