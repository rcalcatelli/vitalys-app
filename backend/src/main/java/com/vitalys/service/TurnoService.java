package com.vitalys.service;

import com.vitalys.domain.EstadoTurno;
import com.vitalys.domain.ExcepcionMorosidad;
import com.vitalys.domain.Persona;
import com.vitalys.domain.RolUsuario;
import com.vitalys.domain.TipoTurno;
import com.vitalys.domain.Turno;
import com.vitalys.domain.Usuario;
import com.vitalys.dto.FranjaGymResponse;
import com.vitalys.dto.ReservaGymRequest;
import com.vitalys.dto.TurnoResponse;
import com.vitalys.exception.AccesoDenegadoException;
import com.vitalys.exception.DatosInvalidosException;
import com.vitalys.exception.RecursoNoEncontradoException;
import com.vitalys.exception.ReglaDeNegocioException;
import com.vitalys.repository.ExcepcionMorosidadRepository;
import com.vitalys.repository.FeriadoRepository;
import com.vitalys.repository.PersonaRepository;
import com.vitalys.repository.TurnoRepository;
import com.vitalys.service.MorosidadService.EstadoDeuda;
import java.time.Clock;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import org.springframework.dao.DataAccessException;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Ciclo de vida de los turnos (Módulo 4). En esta etapa cubre el gimnasio de punta a punta;
 * la reserva de consultorio llega con el Módulo 3 (profesionales y disponibilidad).
 *
 * <p>La grilla, el cupo, los feriados y la superposición los valida el motor; el servicio
 * valida lo que depende de {@code NOW()} o del actor: morosidad (RN-01), excepciones (RN-09),
 * anticipación de la cancelación (RN-02) y autorización por rol (RNF-03).
 */
@Service
public class TurnoService {

    static final ZoneId ZONA = ZoneId.of("America/Argentina/Buenos_Aires");

    /** El check-in se acepta desde un rato antes del inicio de la franja. */
    static final long MINUTOS_CHECKIN_ANTICIPADO = 15;

    private final TurnoRepository turnoRepository;
    private final PersonaRepository personaRepository;
    private final ExcepcionMorosidadRepository excepcionRepository;
    private final FeriadoRepository feriadoRepository;
    private final MorosidadService morosidadService;
    private final JdbcTemplate jdbcTemplate;
    private final Clock clock;

    public TurnoService(
            TurnoRepository turnoRepository,
            PersonaRepository personaRepository,
            ExcepcionMorosidadRepository excepcionRepository,
            FeriadoRepository feriadoRepository,
            MorosidadService morosidadService,
            JdbcTemplate jdbcTemplate,
            Clock clock) {
        this.turnoRepository = turnoRepository;
        this.personaRepository = personaRepository;
        this.excepcionRepository = excepcionRepository;
        this.feriadoRepository = feriadoRepository;
        this.morosidadService = morosidadService;
        this.jdbcTemplate = jdbcTemplate;
        this.clock = clock;
    }

    // ---------------------------------------------------------------- consulta de cupo

    /** Grilla de un día con su ocupación. Domingo o feriado que cierra el gimnasio: lista vacía. */
    @Transactional(readOnly = true)
    public List<FranjaGymResponse> cupoGym(LocalDate fecha) {
        List<Integer> horas = horasDeApertura(fecha);
        if (horas.isEmpty() || feriadoRepository.findCierrePorFecha(fecha).isPresent()) {
            return List.of();
        }
        Integer cupo = jdbcTemplate.queryForObject("SELECT cupo_por_franja FROM configuracion_gym WHERE id = 1", Integer.class);
        OffsetDateTime desde = fecha.atStartOfDay(ZONA).toOffsetDateTime();
        Map<java.time.Instant, Integer> ocupados = new HashMap<>();
        for (Object[] fila : turnoRepository.contarOcupadosGym(desde, desde.plusDays(1))) {
            ocupados.put(instante(fila[0]), ((Number) fila[1]).intValue());
        }
        List<FranjaGymResponse> franjas = new ArrayList<>();
        for (int hora : horas) {
            OffsetDateTime inicio = fecha.atTime(hora, 0).atZone(ZONA).toOffsetDateTime();
            int ocupado = ocupados.getOrDefault(inicio.toInstant(), 0);
            franjas.add(new FranjaGymResponse(inicio, inicio.plusHours(1), cupo, ocupado, Math.max(cupo - ocupado, 0)));
        }
        return franjas;
    }

    /** Mismo horario que {@code fn_franja_gym_valida} (V9): la última franja termina al cierre. */
    static List<Integer> horasDeApertura(LocalDate fecha) {
        DayOfWeek dia = fecha.getDayOfWeek();
        int desde;
        int hasta;
        if (dia == DayOfWeek.SUNDAY) {
            return List.of();
        } else if (dia == DayOfWeek.SATURDAY) {
            desde = 9;
            hasta = 12;
        } else {
            desde = 7;
            hasta = 21;
        }
        List<Integer> horas = new ArrayList<>();
        for (int h = desde; h < hasta; h++) {
            horas.add(h);
        }
        return horas;
    }

    private static java.time.Instant instante(Object valor) {
        if (valor instanceof java.sql.Timestamp ts) {
            return ts.toInstant();
        }
        if (valor instanceof OffsetDateTime odt) {
            return odt.toInstant();
        }
        return ((java.time.Instant) valor);
    }

    // ---------------------------------------------------------------- reserva

    @Transactional
    public TurnoResponse reservarGym(Usuario actor, ReservaGymRequest request) {
        if (actor.getRol() == RolUsuario.PROFESIONAL) {
            throw new AccesoDenegadoException("Un profesional no reserva turnos de gimnasio");
        }
        if (!request.inicio().isAfter(ahora())) {
            throw new ReglaDeNegocioException("No se puede reservar una franja que ya empezó");
        }
        Persona persona = resolverPersona(actor, request.personaId());

        Optional<ExcepcionMorosidad> excepcion = Optional.empty();
        EstadoDeuda deuda = morosidadService.evaluar(persona);
        if (deuda.suspendido()) {
            LocalDate hoy = LocalDate.now(clock);
            excepcion = excepcionRepository.findByPersonaIdOrderByCreadoEnDesc(persona.getId()).stream()
                    .filter(e -> e.vigenteEl(hoy))
                    .findFirst();
            if (excepcion.isEmpty()) {
                throw new ReglaDeNegocioException(String.format(
                        "Reserva de gimnasio suspendida por morosidad: %d períodos impagos (el límite es %d). "
                                + "Regularizá la cuota o pedí una excepción en administración.",
                        deuda.periodosImpagos(), deuda.umbral()));
            }
        }

        Turno turno = guardar(Turno.deGimnasio(persona, actor.getId(), request.inicio()));
        excepcion.ifPresent(e -> {
            e.consumirEn(turno.getId());
            excepcionRepository.save(e);
        });
        return TurnoResponse.de(turno);
    }

    private Persona resolverPersona(Usuario actor, Long personaId) {
        if (esAdmin(actor)) {
            if (personaId == null) {
                throw new DatosInvalidosException("Indicá para qué persona es el turno");
            }
            return personaRepository
                    .findById(personaId)
                    .orElseThrow(() -> new RecursoNoEncontradoException("No existe la persona " + personaId));
        }
        Persona propia = personaRepository
                .findByUsuarioId(actor.getId())
                .orElseThrow(() -> new ReglaDeNegocioException(
                        "Tu ficha todavía no fue cargada por el centro: no podés reservar turnos"));
        if (personaId != null && !personaId.equals(propia.getId())) {
            throw new AccesoDenegadoException("Solo podés reservar turnos para vos");
        }
        return propia;
    }

    // ---------------------------------------------------------------- cancelación y asistencia

    @Transactional
    public TurnoResponse cancelar(Usuario actor, Long id, String motivo) {
        Turno turno = buscar(id);
        if (!esAdmin(actor) && !esDeLaPersona(turno, actor)) {
            throw new AccesoDenegadoException("Solo podés cancelar tus propios turnos");
        }
        if (!turno.estaReservado()) {
            throw new ReglaDeNegocioException("Solo se puede cancelar un turno reservado; este está " + turno.getEstado());
        }
        turno.cancelar(ahora(), actor.getId(), motivo.trim());
        return TurnoResponse.de(guardar(turno));
    }

    /** Gimnasio: check-in del ADMIN (RF-34). Consultorio: el profesional a cargo o un ADMIN (RF-22). */
    @Transactional
    public TurnoResponse marcarCompletado(Usuario actor, Long id) {
        Turno turno = buscarParaMarcar(actor, id);
        if (ahora().isBefore(turno.getInicio().minusMinutes(MINUTOS_CHECKIN_ANTICIPADO))) {
            throw new ReglaDeNegocioException("Todavía no se puede registrar la asistencia: el turno no empezó");
        }
        turno.marcar(EstadoTurno.COMPLETADO);
        return TurnoResponse.de(guardar(turno));
    }

    @Transactional
    public TurnoResponse marcarAusente(Usuario actor, Long id) {
        Turno turno = buscarParaMarcar(actor, id);
        if (ahora().isBefore(turno.getInicio())) {
            throw new ReglaDeNegocioException("No se puede marcar ausente un turno que todavía no empezó");
        }
        turno.marcar(EstadoTurno.AUSENTE);
        return TurnoResponse.de(guardar(turno));
    }

    private Turno buscarParaMarcar(Usuario actor, Long id) {
        Turno turno = buscar(id);
        boolean autorizado = esAdmin(actor)
                || (turno.getTipoTurno() == TipoTurno.CONSULTORIO
                        && actor.getRol() == RolUsuario.PROFESIONAL
                        && Objects.equals(turnoRepository.usuarioDelProfesional(turno.getProfesionalId()), actor.getId()));
        if (!autorizado) {
            throw new AccesoDenegadoException(turno.getTipoTurno() == TipoTurno.GYM
                    ? "La asistencia al gimnasio la registra administración"
                    : "Solo el profesional a cargo puede registrar la asistencia");
        }
        if (!turno.estaReservado()) {
            throw new ReglaDeNegocioException("El turno ya está " + turno.getEstado());
        }
        return turno;
    }

    /** RF-35: cierra como AUSENTE los turnos de gimnasio cuya franja terminó sin check-in. */
    @Transactional
    public int marcarAusentesVencidos() {
        return turnoRepository.marcarAusentesGym(ahora());
    }

    // ---------------------------------------------------------------- consultas

    @Transactional(readOnly = true)
    public List<TurnoResponse> misTurnos(Usuario actor) {
        return personaRepository
                .findByUsuarioId(actor.getId())
                .map(p -> turnoRepository.findByPersonaIdOrderByInicioDesc(p.getId()).stream()
                        .map(TurnoResponse::de)
                        .toList())
                .orElse(List.of());
    }

    @Transactional(readOnly = true)
    public TurnoResponse obtener(Usuario actor, Long id) {
        Turno turno = buscar(id);
        if (!esAdmin(actor) && !esDeLaPersona(turno, actor)) {
            throw new AccesoDenegadoException("No podés ver turnos de otra persona");
        }
        return TurnoResponse.de(turno);
    }

    @Transactional(readOnly = true)
    public List<TurnoResponse> listar(Usuario actor, TipoTurno tipo, EstadoTurno estado, LocalDate fecha, Long personaId) {
        if (!esAdmin(actor)) {
            throw new AccesoDenegadoException("Operación exclusiva del rol ADMIN");
        }
        Specification<Turno> filtro = (root, query, cb) -> null;
        if (tipo != null) {
            filtro = filtro.and((root, query, cb) -> cb.equal(root.get("tipoTurno"), tipo));
        }
        if (estado != null) {
            filtro = filtro.and((root, query, cb) -> cb.equal(root.get("estado"), estado));
        }
        if (personaId != null) {
            filtro = filtro.and((root, query, cb) -> cb.equal(root.get("persona").get("id"), personaId));
        }
        if (fecha != null) {
            OffsetDateTime desde = fecha.atStartOfDay(ZONA).toOffsetDateTime();
            OffsetDateTime hasta = desde.plusDays(1);
            filtro = filtro.and((root, query, cb) -> cb.and(
                    cb.greaterThanOrEqualTo(root.<OffsetDateTime>get("inicio"), desde),
                    cb.lessThan(root.<OffsetDateTime>get("inicio"), hasta)));
        }
        return turnoRepository.findAll(filtro, Sort.by("inicio")).stream().map(TurnoResponse::de).toList();
    }

    // ---------------------------------------------------------------- auxiliares

    private Turno guardar(Turno turno) {
        try {
            return turnoRepository.saveAndFlush(turno);
        } catch (DataAccessException ex) {
            throw ErroresDeBase.traducir(ex);
        }
    }

    private Turno buscar(Long id) {
        return turnoRepository.findById(id).orElseThrow(() -> new RecursoNoEncontradoException("No existe el turno " + id));
    }

    private static boolean esDeLaPersona(Turno turno, Usuario actor) {
        return turno.getPersona().getUsuario().getId().equals(actor.getId());
    }

    private static boolean esAdmin(Usuario actor) {
        return actor.getRol() == RolUsuario.ADMIN;
    }

    private OffsetDateTime ahora() {
        return OffsetDateTime.now(clock);
    }
}
