package com.vitalys.service;

import com.vitalys.domain.AccionOperarComo;
import com.vitalys.domain.DisponibilidadProfesional;
import com.vitalys.domain.Especialidad;
import com.vitalys.domain.EstadoTurno;
import com.vitalys.domain.Persona;
import com.vitalys.domain.Profesional;
import com.vitalys.domain.RolUsuario;
import com.vitalys.domain.TipoTurno;
import com.vitalys.domain.Turno;
import com.vitalys.domain.Usuario;
import com.vitalys.dto.EstadoGymResponse;
import com.vitalys.dto.FranjaGymResponse;
import com.vitalys.dto.ProximaAgendaResponse;
import com.vitalys.dto.ReservaConsultorioRequest;
import com.vitalys.dto.ReservaGymRequest;
import com.vitalys.dto.SlotConsultorioResponse;
import com.vitalys.dto.TurnoAgendaResponse;
import com.vitalys.dto.TurnoResponse;
import com.vitalys.exception.AccesoDenegadoException;
import com.vitalys.exception.DatosInvalidosException;
import com.vitalys.exception.RecursoNoEncontradoException;
import com.vitalys.exception.ReglaDeNegocioException;
import com.vitalys.repository.DisponibilidadProfesionalRepository;
import com.vitalys.repository.ExcepcionMorosidadRepository;
import com.vitalys.repository.FeriadoRepository;
import com.vitalys.repository.PersonaRepository;
import com.vitalys.repository.ProfesionalRepository;
import com.vitalys.repository.TurnoRepository;
import com.vitalys.security.ActorActual;
import com.vitalys.service.MorosidadService.EstadoDeuda;
import com.vitalys.service.MorosidadService.VeredictoMorosidad;
import com.vitalys.service.notificaciones.AvisosTurnoService;
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
import org.springframework.dao.DataAccessException;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Ciclo de vida de los turnos (Módulo 4): gimnasio y consultorio.
 *
 * <p>La grilla, el cupo, los feriados y la superposición los valida el motor; el servicio
 * valida lo que depende de {@code NOW()} o del actor: morosidad (RN-01), excepciones (RN-09),
 * anticipación de la cancelación (RN-02) y autorización por rol (RNF-03).
 *
 * <p>"Operar como" (RN-26/27): el actor es el socio, así que reserva y cancela con SUS reglas;
 * {@code reservado_por}/{@code cancelado_por} guardan al ADMIN que opera (D8) y cada escritura se
 * audita en la misma transacción.
 */
@Service
public class TurnoService {

    static final ZoneId ZONA = ZoneId.of("America/Argentina/Buenos_Aires");

    /** El check-in se acepta desde un rato antes del inicio de la franja. */
    static final long MINUTOS_CHECKIN_ANTICIPADO = 15;

    /** RN-18: un turno de gimnasio se reserva con al menos esta anticipación respecto de su inicio. */
    static final long MINUTOS_ANTICIPACION_MINIMA_GYM = 60;

    /** RN-18: y como mucho con esta anticipación. */
    static final long DIAS_ANTICIPACION_MAXIMA_GYM = 7;

    /** Hasta dónde mira la "próxima agenda" de un profesional (RF-41). */
    static final int HORIZONTE_PROXIMA_AGENDA_DIAS = 21;

    private final TurnoRepository turnoRepository;
    private final PersonaRepository personaRepository;
    private final ExcepcionMorosidadRepository excepcionRepository;
    private final FeriadoRepository feriadoRepository;
    private final MorosidadService morosidadService;
    private final ProfesionalRepository profesionalRepository;
    private final DisponibilidadProfesionalRepository disponibilidadRepository;
    private final JdbcTemplate jdbcTemplate;
    private final AvisosTurnoService avisos;
    private final ActorActual actorActual;
    private final AuditoriaOperarComoService auditoria;
    private final Clock clock;

    public TurnoService(
            TurnoRepository turnoRepository,
            PersonaRepository personaRepository,
            ExcepcionMorosidadRepository excepcionRepository,
            FeriadoRepository feriadoRepository,
            MorosidadService morosidadService,
            ProfesionalRepository profesionalRepository,
            DisponibilidadProfesionalRepository disponibilidadRepository,
            JdbcTemplate jdbcTemplate,
            AvisosTurnoService avisos,
            ActorActual actorActual,
            AuditoriaOperarComoService auditoria,
            Clock clock) {
        this.turnoRepository = turnoRepository;
        this.personaRepository = personaRepository;
        this.excepcionRepository = excepcionRepository;
        this.feriadoRepository = feriadoRepository;
        this.morosidadService = morosidadService;
        this.profesionalRepository = profesionalRepository;
        this.disponibilidadRepository = disponibilidadRepository;
        this.jdbcTemplate = jdbcTemplate;
        this.avisos = avisos;
        this.actorActual = actorActual;
        this.auditoria = auditoria;
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
        validarAnticipacionGym(request.inicio());
        Persona persona = resolverPersona(actor, request.personaId());

        VeredictoMorosidad veredicto = morosidadService.veredicto(persona);
        if (veredicto.bloqueado()) {
            EstadoDeuda deuda = veredicto.deuda();
            throw new ReglaDeNegocioException(String.format(
                    "Reserva de gimnasio suspendida por morosidad: %d períodos impagos (el límite es %d). "
                            + "Regularizá la cuota o pedí una excepción en administración.",
                    deuda.periodosImpagos(), deuda.umbral()));
        }

        Turno turno = guardar(Turno.deGimnasio(persona, actorActual.idDeQuienOpera(actor), request.inicio()));
        veredicto.excepcion().ifPresent(e -> {
            e.consumirEn(turno.getId());
            excepcionRepository.save(e);
        });
        auditoria.registrarSiOpera(AccionOperarComo.RESERVA_GYM, turno);
        avisos.confirmarReserva(turno);
        return TurnoResponse.de(turno);
    }

    /** RN-18 / CA-08-5: depende de {@code NOW()}, por eso se valida acá y no en la base. */
    private void validarAnticipacionGym(OffsetDateTime inicio) {
        OffsetDateTime ahora = ahora();
        if (inicio.isBefore(ahora.plusMinutes(MINUTOS_ANTICIPACION_MINIMA_GYM))) {
            throw new ReglaDeNegocioException(
                    "Las reservas de gimnasio se cierran 1 hora antes del inicio de la franja");
        }
        if (inicio.isAfter(ahora.plusDays(DIAS_ANTICIPACION_MAXIMA_GYM))) {
            throw new ReglaDeNegocioException(
                    "Solo se puede reservar gimnasio hasta 7 días antes de la franja");
        }
    }

    /**
     * Estado de gimnasio de una persona para la pantalla de reserva. {@code suspendido} es el
     * veredicto de la reserva: false si hay una excepción vigente aunque la deuda llegue al umbral.
     */
    @Transactional(readOnly = true)
    public EstadoGymResponse estadoGym(Usuario actor, Long personaId) {
        if (actor.getRol() == RolUsuario.PROFESIONAL) {
            throw new AccesoDenegadoException("Un profesional no tiene turnos de gimnasio");
        }
        Persona persona = resolverPersona(actor, personaId, "Solo podés consultar tu propio estado");
        VeredictoMorosidad veredicto = morosidadService.veredicto(persona);
        return new EstadoGymResponse(
                persona.isEsSocioGym(),
                veredicto.bloqueado(),
                veredicto.deuda().periodosImpagos(),
                veredicto.deuda().umbral(),
                veredicto.deuda().suspendido() && veredicto.excepcion().isPresent());
    }

    // ---------------------------------------------------------------- consultorio

    /**
     * Slots del día de un profesional, partiendo cada franja activa en turnos de su duración.
     * Un slot no está libre si ya pasó o se superpone con un turno que ocupa el lugar.
     */
    @Transactional(readOnly = true)
    public List<SlotConsultorioResponse> slotsDisponibles(Long profesionalId, LocalDate fecha) {
        Profesional profesional = profesionalRepository
                .findById(profesionalId)
                .orElseThrow(() -> new RecursoNoEncontradoException("No existe el profesional " + profesionalId));
        if (!profesional.isActivo()) {
            return List.of();
        }
        List<OffsetDateTime[]> slots =
                generarSlots(franjasDelDia(profesionalId, fecha), fecha, profesional.getDuracionTurnoMinutos());
        if (slots.isEmpty()) {
            return List.of();
        }
        OffsetDateTime desde = fecha.atStartOfDay(ZONA).toOffsetDateTime();
        List<java.time.Instant[]> ocupados = new ArrayList<>();
        for (Object[] fila : turnoRepository.ocupadosDeProfesional(profesionalId, desde, desde.plusDays(1))) {
            ocupados.add(new java.time.Instant[] {instante(fila[0]), instante(fila[1])});
        }
        java.time.Instant ahora = ahora().toInstant();
        List<SlotConsultorioResponse> respuesta = new ArrayList<>();
        for (OffsetDateTime[] slot : slots) {
            java.time.Instant ini = slot[0].toInstant();
            java.time.Instant fin = slot[1].toInstant();
            boolean tomado = ocupados.stream().anyMatch(o -> o[0].isBefore(fin) && o[1].isAfter(ini));
            respuesta.add(new SlotConsultorioResponse(slot[0], slot[1], ini.isAfter(ahora) && !tomado));
        }
        return respuesta;
    }

    /**
     * Reserva de consultorio (RF-15). No evalúa morosidad: la suspensión es solo de gimnasio
     * (Decisión de dominio 1). Toma el mismo lock de fila del profesional que la cascada de
     * disponibilidad (RN-24), así una reserva no puede colarse mientras se recortan sus franjas.
     */
    @Transactional
    public TurnoResponse reservarConsultorio(Usuario actor, ReservaConsultorioRequest request) {
        if (actor.getRol() == RolUsuario.PROFESIONAL) {
            throw new AccesoDenegadoException("Un profesional no reserva turnos");
        }
        if (!request.inicio().isAfter(ahora())) {
            throw new ReglaDeNegocioException("No se puede reservar un horario que ya empezó");
        }
        Persona persona = resolverPersona(actor, request.personaId());
        Profesional profesional = profesionalRepository
                .buscarParaActualizar(request.profesionalId())
                .orElseThrow(() -> new RecursoNoEncontradoException("No existe el profesional " + request.profesionalId()));
        if (!profesional.isActivo()) {
            throw new ReglaDeNegocioException("El profesional no está atendiendo");
        }
        LocalDate fecha = request.inicio().atZoneSameInstant(ZONA).toLocalDate();
        java.time.Instant pedido = request.inicio().toInstant();
        OffsetDateTime[] slot = generarSlots(franjasDelDia(profesional.getId(), fecha), fecha, profesional.getDuracionTurnoMinutos())
                .stream()
                .filter(s -> s[0].toInstant().equals(pedido))
                .findFirst()
                .orElseThrow(() -> new ReglaDeNegocioException(
                        "Ese horario no está dentro de la disponibilidad del profesional"));
        Turno turno = guardar(Turno.deConsultorio(
                persona, profesional.getId(), actorActual.idDeQuienOpera(actor), slot[0], slot[1]));
        auditoria.registrarSiOpera(AccionOperarComo.RESERVA_CONSULTORIO, turno);
        avisos.confirmarReserva(turno);
        return TurnoResponse.de(turno);
    }

    /** Agenda del profesional autenticado (W-03). Por defecto, de hoy a siete días. */
    @Transactional(readOnly = true)
    public List<TurnoAgendaResponse> miAgenda(Usuario actor, LocalDate desde, LocalDate hasta) {
        if (actor.getRol() != RolUsuario.PROFESIONAL) {
            throw new AccesoDenegadoException("La agenda es del rol PROFESIONAL");
        }
        Profesional profesional = profesionalRepository
                .findByUsuarioId(actor.getId())
                .orElseThrow(() -> new RecursoNoEncontradoException("Tu usuario no tiene ficha de profesional"));
        LocalDate inicio = desde != null ? desde : LocalDate.now(clock);
        LocalDate fin = hasta != null ? hasta : inicio.plusDays(7);
        if (fin.isBefore(inicio)) {
            throw new DatosInvalidosException("La fecha final no puede ser anterior a la inicial");
        }
        return turnoRepository
                .agendaDeProfesional(
                        profesional.getId(),
                        inicio.atStartOfDay(ZONA).toOffsetDateTime(),
                        fin.plusDays(1).atStartOfDay(ZONA).toOffsetDateTime())
                .stream()
                .map(TurnoAgendaResponse::de)
                .toList();
    }

    /**
     * RF-41: para cada profesional activo (de la especialidad, si se indica), el primer día desde hoy
     * con al menos un turno libre dentro de {@value #HORIZONTE_PROXIMA_AGENDA_DIAS} días y cuántos
     * tiene ese día. Usa la misma generación de slots y la misma ocupación que {@link #slotsDisponibles}
     * (RN-03: solo cuentan los turnos que ocupan lugar; los slots que ya pasaron no están libres).
     * Dos consultas por profesional sin importar cuántos días recorra.
     */
    @Transactional(readOnly = true)
    public List<ProximaAgendaResponse> proximasAgendas(Usuario actor, Especialidad especialidad) {
        if (actor.getRol() == RolUsuario.PROFESIONAL) {
            throw new AccesoDenegadoException("Un profesional no reserva turnos");
        }
        LocalDate hoy = LocalDate.now(clock);
        OffsetDateTime desde = hoy.atStartOfDay(ZONA).toOffsetDateTime();
        OffsetDateTime hasta = hoy.plusDays(HORIZONTE_PROXIMA_AGENDA_DIAS).atStartOfDay(ZONA).toOffsetDateTime();
        java.time.Instant ahora = ahora().toInstant();
        List<ProximaAgendaResponse> respuesta = new ArrayList<>();
        for (Profesional p : profesionalRepository.findByActivo(true, Sort.by("apellido", "nombre"))) {
            if (especialidad != null && p.getEspecialidad() != especialidad) {
                continue;
            }
            List<DisponibilidadProfesional> franjas =
                    disponibilidadRepository.findByProfesionalIdOrderByDiaSemanaAscHoraInicioAsc(p.getId());
            LocalDate fecha = null;
            int libres = 0;
            if (franjas.stream().anyMatch(DisponibilidadProfesional::isActivo)) {
                List<java.time.Instant[]> ocupados = new ArrayList<>();
                for (Object[] fila : turnoRepository.ocupadosDeProfesional(p.getId(), desde, hasta)) {
                    ocupados.add(new java.time.Instant[] {instante(fila[0]), instante(fila[1])});
                }
                for (int i = 0; i < HORIZONTE_PROXIMA_AGENDA_DIAS && fecha == null; i++) {
                    LocalDate dia = hoy.plusDays(i);
                    int n = (int) generarSlots(franjasDelDia(franjas, dia), dia, p.getDuracionTurnoMinutos()).stream()
                            .filter(s -> s[0].toInstant().isAfter(ahora)
                                    && ocupados.stream().noneMatch(o -> o[0].isBefore(s[1].toInstant()) && o[1].isAfter(s[0].toInstant())))
                            .count();
                    if (n > 0) {
                        fecha = dia;
                        libres = n;
                    }
                }
            }
            respuesta.add(new ProximaAgendaResponse(
                    p.getId(), p.getNombre(), p.getApellido(), p.getEspecialidad(), p.getDuracionTurnoMinutos(), fecha, libres));
        }
        return respuesta;
    }

    private List<DisponibilidadProfesional> franjasDelDia(Long profesionalId, LocalDate fecha) {
        return franjasDelDia(disponibilidadRepository.findByProfesionalIdOrderByDiaSemanaAscHoraInicioAsc(profesionalId), fecha);
    }

    private static List<DisponibilidadProfesional> franjasDelDia(List<DisponibilidadProfesional> franjas, LocalDate fecha) {
        int dia = fecha.getDayOfWeek().getValue();
        return franjas.stream().filter(f -> f.isActivo() && f.getDiaSemana() == dia).toList();
    }

    /**
     * Parte cada franja en turnos consecutivos de {@code minutos}, desde su inicio, sin pasarse de
     * su fin. Se calcula en minutos del día para que una franja que termina cerca de medianoche
     * no dé la vuelta.
     */
    static List<OffsetDateTime[]> generarSlots(List<DisponibilidadProfesional> franjas, LocalDate fecha, int minutos) {
        List<OffsetDateTime[]> slots = new ArrayList<>();
        for (DisponibilidadProfesional franja : franjas) {
            int desde = franja.getHoraInicio().toSecondOfDay() / 60;
            int hasta = franja.getHoraFin().toSecondOfDay() / 60;
            for (int m = desde; m + minutos <= hasta; m += minutos) {
                OffsetDateTime inicio = fecha.atStartOfDay(ZONA).plusMinutes(m).toOffsetDateTime();
                slots.add(new OffsetDateTime[] {inicio, inicio.plusMinutes(minutos)});
            }
        }
        return slots;
    }

    private Persona resolverPersona(Usuario actor, Long personaId) {
        return resolverPersona(actor, personaId, "Solo podés reservar turnos para vos");
    }

    private Persona resolverPersona(Usuario actor, Long personaId, String mensajeAjena) {
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
            throw new AccesoDenegadoException(mensajeAjena);
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
        turno.cancelar(ahora(), actorActual.idDeQuienOpera(actor), motivo.trim());
        Turno cancelado = guardar(turno);
        auditoria.registrarSiOpera(AccionOperarComo.CANCELACION, cancelado);
        avisos.avisarCancelacion(cancelado);
        return TurnoResponse.de(cancelado);
    }

    /** Gimnasio: check-in del ADMIN (RF-34). Consultorio: el profesional a cargo o un ADMIN (RF-22). */
    @Transactional
    public TurnoResponse marcarCompletado(Usuario actor, Long id) {
        Turno turno = buscarParaMarcar(actor, id);
        if (ahora().isBefore(turno.getInicio().minusMinutes(MINUTOS_CHECKIN_ANTICIPADO))) {
            throw new ReglaDeNegocioException("Todavía no se puede registrar la asistencia: el turno no empezó");
        }
        turno.completar(ahora());
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
        return turnoRepository.findAll(filtro, Sort.by("inicio")).stream().map(TurnoResponse::paraAdmin).toList();
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
