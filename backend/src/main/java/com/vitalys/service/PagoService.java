package com.vitalys.service;

import com.vitalys.domain.ConceptoPago;
import com.vitalys.domain.EstadoTurno;
import com.vitalys.domain.ExcepcionMorosidad;
import com.vitalys.domain.Pago;
import com.vitalys.domain.Persona;
import com.vitalys.domain.Profesional;
import com.vitalys.domain.RolUsuario;
import com.vitalys.domain.Turno;
import com.vitalys.domain.Usuario;
import com.vitalys.dto.EstadoCuentaResponse;
import com.vitalys.dto.EstadoCuentaResponse.ExcepcionInfo;
import com.vitalys.dto.EstadoCuentaResponse.PagoDto;
import com.vitalys.dto.EstadoCuentaResponse.PeriodoDto;
import com.vitalys.dto.EstadoCuentaResponse.SesionDto;
import com.vitalys.dto.EstadoCuentaResponse.Totales;
import com.vitalys.dto.PagoResponse;
import com.vitalys.dto.RegistrarPagoRequest;
import com.vitalys.exception.AccesoDenegadoException;
import com.vitalys.exception.RecursoNoEncontradoException;
import com.vitalys.exception.ReglaDeNegocioException;
import com.vitalys.repository.PagoRepository;
import com.vitalys.repository.PersonaRepository;
import com.vitalys.repository.ProfesionalRepository;
import com.vitalys.repository.TurnoRepository;
import com.vitalys.service.MorosidadService.PeriodoEstado;
import com.vitalys.service.MorosidadService.VeredictoMorosidad;
import java.time.Clock;
import java.time.LocalDate;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
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
    private final ProfesionalRepository profesionalRepository;
    private final MorosidadService morosidadService;
    private final Clock clock;

    public PagoService(
            PagoRepository pagoRepository,
            PersonaRepository personaRepository,
            TurnoRepository turnoRepository,
            ProfesionalRepository profesionalRepository,
            MorosidadService morosidadService,
            Clock clock) {
        this.pagoRepository = pagoRepository;
        this.personaRepository = personaRepository;
        this.turnoRepository = turnoRepository;
        this.profesionalRepository = profesionalRepository;
        this.morosidadService = morosidadService;
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

    // ---------------------------------------------------------------- estado de cuenta

    /** ADMIN consulta a cualquiera; el socio solo la propia; el profesional no tiene cuenta. */
    @Transactional(readOnly = true)
    public EstadoCuentaResponse estadoCuenta(Usuario actor, Long personaId) {
        if (actor.getRol() == RolUsuario.PROFESIONAL) {
            throw new AccesoDenegadoException("Un profesional no tiene estado de cuenta");
        }
        if (actor.getRol() == RolUsuario.ADMIN) {
            Persona persona = personaRepository
                    .findById(personaId)
                    .orElseThrow(() -> new RecursoNoEncontradoException("No existe la persona " + personaId));
            return armarEstadoCuenta(persona);
        }
        Persona propia = fichaPropia(actor);
        if (!propia.getId().equals(personaId)) {
            throw new AccesoDenegadoException("Solo podés consultar tu propio estado de cuenta");
        }
        return armarEstadoCuenta(propia);
    }

    @Transactional(readOnly = true)
    public EstadoCuentaResponse miEstadoCuenta(Usuario actor) {
        if (actor.getRol() == RolUsuario.PROFESIONAL) {
            throw new AccesoDenegadoException("Un profesional no tiene estado de cuenta");
        }
        return armarEstadoCuenta(fichaPropia(actor));
    }

    private Persona fichaPropia(Usuario actor) {
        return personaRepository
                .findByUsuarioId(actor.getId())
                .orElseThrow(() -> new ReglaDeNegocioException(
                        "Tu ficha todavía no fue cargada por el centro: no tenés estado de cuenta"));
    }

    private EstadoCuentaResponse armarEstadoCuenta(Persona persona) {
        VeredictoMorosidad veredicto = morosidadService.veredicto(persona);
        List<Pago> pagos = pagoRepository.findByPersonaIdOrderByFechaPagoDesc(persona.getId());

        // Ordenados del más nuevo al más viejo: si hubiera dos por periodo, queda el más reciente.
        Map<LocalDate, Pago> cuotas = new HashMap<>();
        pagos.stream()
                .filter(p -> p.getConcepto() == ConceptoPago.CUOTA_MENSUAL && p.getPeriodo() != null)
                .forEach(p -> cuotas.putIfAbsent(p.getPeriodo(), p));
        List<Pago> sesionesPagas = pagos.stream()
                .filter(p -> p.getConcepto() == ConceptoPago.SESION_CONSULTORIO)
                .toList();

        List<PeriodoDto> periodos = List.of();
        if (persona.isEsSocioGym() && persona.getFechaInicioMembresia() != null) {
            List<PeriodoEstado> detalle = MorosidadService.periodos(
                    persona.getFechaInicioMembresia(), new HashSet<>(cuotas.keySet()), LocalDate.now(clock));
            periodos = detalle.stream()
                    .map(p -> new PeriodoDto(p.periodo(), p.vence(), p.limite(), p.estado(), pagoDto(cuotas.get(p.periodo()))))
                    .toList();
        }

        Map<Long, Turno> turnos = turnoRepository
                .findAllById(sesionesPagas.stream().map(Pago::getTurnoId).filter(Objects::nonNull).toList())
                .stream()
                .collect(Collectors.toMap(Turno::getId, Function.identity()));
        // Un solo findAllById para todos los profesionales de las sesiones (sin consulta por sesión)
        Map<Long, Profesional> profesionales = profesionalRepository
                .findAllById(turnos.values().stream().map(Turno::getProfesionalId).filter(Objects::nonNull).distinct().toList())
                .stream()
                .collect(Collectors.toMap(Profesional::getId, Function.identity()));
        List<SesionDto> sesiones = sesionesPagas.stream()
                .map(p -> sesionDto(p, turnos.get(p.getTurnoId()), profesionales))
                .toList();

        BigDecimal total = pagos.stream().map(Pago::getMonto).reduce(BigDecimal.ZERO, BigDecimal::add);
        ExcepcionInfo excepcion = veredicto.deuda().suspendido()
                ? veredicto.excepcion().map(this::excepcionInfo).orElse(null)
                : null;
        return new EstadoCuentaResponse(
                persona.getId(),
                persona.getNombre() + " " + persona.getApellido(),
                persona.isEsSocioGym(),
                persona.getFechaInicioMembresia(),
                veredicto.deuda().periodosImpagos(),
                veredicto.deuda().umbral(),
                veredicto.bloqueado(),
                excepcion,
                periodos,
                sesiones,
                new Totales(pagos.size(), total));
    }

    private static SesionDto sesionDto(Pago p, Turno turno, Map<Long, Profesional> profesionales) {
        Profesional pro = turno == null || turno.getProfesionalId() == null ? null : profesionales.get(turno.getProfesionalId());
        return new SesionDto(
                p.getId(),
                p.getTurnoId(),
                turno == null ? null : turno.getInicio(),
                pro == null ? null : pro.getNombre() + " " + pro.getApellido(),
                pro == null ? null : pro.getEspecialidad(),
                p.getMonto(),
                p.getMedio(),
                p.getFechaPago());
    }

    /** Quién otorgó la excepción: el nombre de su ficha de persona (p. ej. la recepcionista); "Recepción" si no tiene. */
    private ExcepcionInfo excepcionInfo(ExcepcionMorosidad e) {
        String autor = personaRepository
                .findByUsuarioId(e.getAutorizadoPor())
                .map(a -> a.getNombre() + " " + a.getApellido())
                .orElse("Recepción");
        return new ExcepcionInfo(e.getValidaHasta(), e.getMotivo(), autor, e.getCreadoEn());
    }

    private static PagoDto pagoDto(Pago p) {
        return p == null ? null : new PagoDto(p.getId(), p.getMonto(), p.getMedio(), p.getFechaPago());
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
