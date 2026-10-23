package com.vitalys.service;

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
import java.time.ZoneId;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * "Operar como" (RF-39, RN-26): Recepción opera en nombre de un socio con una credencial de 30
 * minutos, auditada (RN-27). Las reglas de rol viven acá (RNF-03) además de la regla declarativa
 * {@code /api/admin/**}: solo un ADMIN con sesión NORMAL inicia, y solo sobre un SOCIO_PACIENTE
 * habilitado con ficha activa.
 */
@Service
public class OperarComoService {

    private static final ZoneId ZONA = ZoneId.of("America/Argentina/Buenos_Aires");

    private final PersonaRepository personaRepository;
    private final JwtService jwtService;
    private final ActorActual actorActual;
    private final AuditoriaOperarComoService auditoria;

    public OperarComoService(
            PersonaRepository personaRepository,
            JwtService jwtService,
            ActorActual actorActual,
            AuditoriaOperarComoService auditoria) {
        this.personaRepository = personaRepository;
        this.jwtService = jwtService;
        this.actorActual = actorActual;
        this.auditoria = auditoria;
    }

    @Transactional
    public OperarComoResponse iniciar(Usuario actor, Long personaId) {
        // Sin anidamiento ni renovación (CA-10-3): una sesión de "Operar como" no abre otra. El
        // principal de esa sesión es un socio, así que la regla de rol ya la frena; esto es la
        // segunda barrera por si algún día cambia cómo se arma el principal.
        if (actorActual.operando()) {
            throw new AccesoDenegadoException("No se puede iniciar Operar como desde otra sesión de Operar como");
        }
        if (actor.getRol() != RolUsuario.ADMIN) {
            throw new AccesoDenegadoException("Operación exclusiva del rol ADMIN");
        }
        Persona persona = personaRepository
                .findById(personaId)
                .orElseThrow(() -> new RecursoNoEncontradoException("No existe la persona " + personaId));
        Usuario sujeto = persona.getUsuario();
        if (sujeto.getRol() != RolUsuario.SOCIO_PACIENTE || sujeto.getId().equals(actor.getId())) {
            throw new AccesoDenegadoException("Solo se puede operar en nombre de un socio o paciente");
        }
        if (!persona.estaActiva()) {
            throw new ReglaDeNegocioException("La persona está dada de baja");
        }
        if (!sujeto.isEnabled()) {
            throw new ReglaDeNegocioException("El usuario de la persona está deshabilitado");
        }

        UUID sesionId = UUID.randomUUID();
        auditoria.registrarInicio(sesionId, actor.getId(), sujeto.getId(), persona.getId());
        JwtService.TokenOperarComo token = jwtService.generarOperarComo(sujeto, actor, sesionId);
        return new OperarComoResponse(
                token.token(),
                token.expiraEn().atZone(ZONA).toOffsetDateTime(),
                new OperarComoResponse.PersonaResumen(persona.getId(), persona.getNombre(), persona.getApellido()));
    }

    /**
     * Termina la sesión en curso (CA-10-8): audita el FIN, y con esa fila la credencial deja de
     * autenticar aunque no haya vencido.
     */
    @Transactional
    public void terminar() {
        OperarComoAuthentication sesion = actorActual
                .sesion()
                .orElseThrow(() -> new ReglaDeNegocioException("No hay una sesión de Operar como en curso"));
        Long personaId = personaRepository
                .findByUsuarioId(sesion.getPrincipal().getId())
                .map(Persona::getId)
                .orElseThrow(() -> new RecursoNoEncontradoException("El socio no tiene ficha"));
        auditoria.registrarFin(sesion, personaId);
    }
}
