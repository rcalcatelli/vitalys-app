package com.vitalys.service;

import com.vitalys.domain.ExcepcionMorosidad;
import com.vitalys.domain.Persona;
import com.vitalys.domain.RolUsuario;
import com.vitalys.domain.Usuario;
import com.vitalys.dto.ExcepcionMorosidadRequest;
import com.vitalys.dto.ExcepcionMorosidadResponse;
import com.vitalys.exception.AccesoDenegadoException;
import com.vitalys.exception.DatosInvalidosException;
import com.vitalys.exception.RecursoNoEncontradoException;
import com.vitalys.exception.ReglaDeNegocioException;
import com.vitalys.repository.ExcepcionMorosidadRepository;
import com.vitalys.repository.PersonaRepository;
import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** RF-30 / RN-09: el ADMIN levanta puntualmente la suspensión por morosidad de un socio. */
@Service
public class ExcepcionMorosidadService {

    private final ExcepcionMorosidadRepository excepcionRepository;
    private final PersonaRepository personaRepository;
    private final MorosidadService morosidadService;
    private final Clock clock;

    public ExcepcionMorosidadService(
            ExcepcionMorosidadRepository excepcionRepository,
            PersonaRepository personaRepository,
            MorosidadService morosidadService,
            Clock clock) {
        this.excepcionRepository = excepcionRepository;
        this.personaRepository = personaRepository;
        this.morosidadService = morosidadService;
        this.clock = clock;
    }

    @Transactional
    public ExcepcionMorosidadResponse crear(Usuario actor, ExcepcionMorosidadRequest request) {
        exigirAdmin(actor);
        Persona persona = personaRepository
                .findById(request.personaId())
                .orElseThrow(() -> new RecursoNoEncontradoException("No existe la persona " + request.personaId()));
        if (request.validaHasta().isBefore(LocalDate.now(clock))) {
            throw new DatosInvalidosException("La excepción no puede vencer en el pasado");
        }
        // RN-09 / CA-08-8 (PI-137): solo se autoriza a quien está efectivamente suspendido (deuda >= umbral).
        // Quien no es socio de gimnasio no tiene deuda (SIN_MEMBRESIA) y cae acá también. Una excepción ya
        // vigente NO bloquea otra: el ADMIN puede renovarla o ampliarla mientras la suspensión siga en pie.
        if (!morosidadService.veredicto(persona).deuda().suspendido()) {
            throw new ReglaDeNegocioException(
                    "No se puede autorizar una excepción: la persona no está suspendida por morosidad");
        }
        ExcepcionMorosidad excepcion = new ExcepcionMorosidad(
                request.personaId(), actor.getId(), request.motivo().trim(), request.validaHasta(), request.unSoloUso());
        return ExcepcionMorosidadResponse.de(excepcionRepository.save(excepcion));
    }

    @Transactional(readOnly = true)
    public List<ExcepcionMorosidadResponse> listarPorPersona(Usuario actor, Long personaId) {
        exigirAdmin(actor);
        return excepcionRepository.findByPersonaIdOrderByCreadoEnDesc(personaId).stream()
                .map(ExcepcionMorosidadResponse::de)
                .toList();
    }

    private static void exigirAdmin(Usuario actor) {
        if (actor.getRol() != RolUsuario.ADMIN) {
            throw new AccesoDenegadoException("Operación exclusiva del rol ADMIN");
        }
    }
}
