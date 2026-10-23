package com.vitalys.service;

import com.vitalys.domain.AccionOperarComo;
import com.vitalys.domain.AuditoriaOperarComo;
import com.vitalys.domain.Turno;
import com.vitalys.repository.AuditoriaOperarComoRepository;
import com.vitalys.security.ActorActual;
import com.vitalys.security.OperarComoAuthentication;
import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Registro de auditoría de "Operar como" (RN-27, design.md D6). Cada método corre DENTRO de la
 * transacción de la escritura que audita ({@link Propagation#MANDATORY}): la fila y la escritura se
 * confirman juntas, y si la fila no se puede guardar la excepción revierte la operación entera.
 */
@Service
public class AuditoriaOperarComoService {

    private final AuditoriaOperarComoRepository repository;
    private final ActorActual actorActual;
    private final Clock clock;

    public AuditoriaOperarComoService(AuditoriaOperarComoRepository repository, ActorActual actorActual, Clock clock) {
        this.repository = repository;
        this.actorActual = actorActual;
        this.clock = clock;
    }

    /**
     * Audita una escritura sobre un turno si la request es de "Operar como"; si no, no hace nada.
     * El sujeto es el dueño del turno: los servicios ya garantizan que un socio solo escribe lo suyo.
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public void registrarSiOpera(AccionOperarComo accion, Turno turno) {
        actorActual.sesion().ifPresent(sesion -> guardar(new AuditoriaOperarComo(
                sesion.getSesionId(),
                sesion.getOperador().getId(),
                sesion.getPrincipal().getId(),
                turno.getPersona().getId(),
                accion,
                turno.getId(),
                OffsetDateTime.now(clock))));
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void registrarInicio(UUID sesionId, Long operadorId, Long sujetoId, Long personaId) {
        guardar(new AuditoriaOperarComo(sesionId, operadorId, sujetoId, personaId, AccionOperarComo.INICIO, null, OffsetDateTime.now(clock)));
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void registrarFin(OperarComoAuthentication sesion, Long personaId) {
        guardar(new AuditoriaOperarComo(
                sesion.getSesionId(),
                sesion.getOperador().getId(),
                sesion.getPrincipal().getId(),
                personaId,
                AccionOperarComo.FIN,
                null,
                OffsetDateTime.now(clock)));
    }

    private void guardar(AuditoriaOperarComo fila) {
        try {
            repository.saveAndFlush(fila);
        } catch (DataAccessException ex) {
            // RN-27: sin auditoría no hay escritura. La excepción revierte la transacción del llamador.
            throw new IllegalStateException("No se pudo registrar la auditoría de Operar como", ex);
        }
    }
}
