package com.vitalys.service;

import com.vitalys.domain.ConceptoPago;
import com.vitalys.domain.EstadoTurno;
import com.vitalys.domain.Pago;
import com.vitalys.domain.Persona;
import com.vitalys.domain.RolUsuario;
import com.vitalys.domain.Usuario;
import com.vitalys.dto.PagoResponse;
import com.vitalys.dto.RegistrarPagoRequest;
import com.vitalys.exception.AccesoDenegadoException;
import com.vitalys.exception.RecursoNoEncontradoException;
import com.vitalys.exception.ReglaDeNegocioException;
import com.vitalys.repository.PagoRepository;
import com.vitalys.repository.PersonaRepository;
import com.vitalys.repository.TurnoRepository;
import java.time.Clock;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.EnumSet;
import java.util.Set;
import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * RF-14 / RF-15: el ADMIN registra a mano las cuotas y las sesiones. Acá solo viven las reglas
 * que el motor no puede ver (rol, membresía, estado del turno); la coherencia concepto/periodo/
 * turno y el tipo y dueño del turno los rechaza la base y {@link ErroresDeBase} los traduce.
 */
@Service
public class PagoService {

    /** RN-02: la cancelación tardía se sanciona, no se cobra; las demás cancelaciones tampoco. */
    private static final Set<EstadoTurno> CANCELADOS =
            EnumSet.of(EstadoTurno.CANCELADO_EN_TIEMPO, EstadoTurno.CANCELADO_TARDE, EstadoTurno.CANCELADO_POR_PROFESIONAL);

    private final PagoRepository pagoRepository;
    private final PersonaRepository personaRepository;
    private final TurnoRepository turnoRepository;
    private final Clock clock;

    public PagoService(
            PagoRepository pagoRepository, PersonaRepository personaRepository, TurnoRepository turnoRepository, Clock clock) {
        this.pagoRepository = pagoRepository;
        this.personaRepository = personaRepository;
        this.turnoRepository = turnoRepository;
        this.clock = clock;
    }

    @Transactional
    public PagoResponse registrar(Usuario actor, RegistrarPagoRequest request) {
        if (actor.getRol() != RolUsuario.ADMIN) {
            throw new AccesoDenegadoException("Operación exclusiva del rol ADMIN");
        }
        Persona persona = personaRepository
                .findById(request.personaId())
                .orElseThrow(() -> new RecursoNoEncontradoException("No existe la persona " + request.personaId()));
        if (request.concepto() == ConceptoPago.CUOTA_MENSUAL && request.periodo() != null) {
            validarCuota(persona, request.periodo());
        }
        if (request.concepto() == ConceptoPago.SESION_CONSULTORIO && request.turnoId() != null) {
            validarSesion(request.turnoId());
        }
        Pago pago = new Pago(
                persona.getId(),
                request.concepto(),
                request.monto(),
                request.medio(),
                request.periodo(),
                request.turnoId(),
                actor.getId(),
                OffsetDateTime.now(clock));
        try {
            return PagoResponse.de(pagoRepository.saveAndFlush(pago));
        } catch (DataAccessException ex) {
            // Sin traducir, un unique violation caería en el handler que responde "email ya registrado"
            throw ErroresDeBase.traducir(ex);
        }
    }

    /** El periodo puede ser futuro (adelantado) pero no anterior al mes de inicio de la membresía. */
    private static void validarCuota(Persona persona, LocalDate periodo) {
        if (!persona.isEsSocioGym() || persona.getFechaInicioMembresia() == null) {
            throw new ReglaDeNegocioException("La persona no es socia del gimnasio: no tiene cuota para cobrar");
        }
        if (periodo.isBefore(persona.getFechaInicioMembresia().withDayOfMonth(1))) {
            throw new ReglaDeNegocioException("El periodo es anterior al inicio de la membresía de la persona");
        }
    }

    /**
     * Un turno inexistente se deja pasar a propósito: lo rechaza la clave foránea (23503) y se
     * traduce a 422, igual que el tipo y el dueño del turno, que valida el trigger.
     */
    private void validarSesion(Long turnoId) {
        turnoRepository.findById(turnoId).ifPresent(turno -> {
            if (CANCELADOS.contains(turno.getEstado())) {
                throw new ReglaDeNegocioException("El turno está cancelado: no se cobra una sesión que no se realizó");
            }
        });
    }
}
