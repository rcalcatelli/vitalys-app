package com.vitalys.service;

import com.vitalys.domain.ExcepcionMorosidad;
import com.vitalys.domain.Persona;
import com.vitalys.repository.ExcepcionMorosidadRepository;
import java.time.Clock;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/**
 * RN-01: deuda de gimnasio como cantidad de períodos mensuales impagos desde
 * {@code fecha_inicio_membresia}, y suspensión al alcanzar el umbral configurable.
 *
 * <p>Es la única fuente de la regla: la reserva de gimnasio ({@code TurnoService}) y el estado de
 * cuenta ({@code PagoService}) usan {@link #veredicto} y {@link #periodos}, nunca la recalculan.
 */
@Service
public class MorosidadService {

    /** Días de gracia después del vencimiento (1° del mes siguiente al período). */
    static final int DIAS_DE_GRACIA = 10;

    private final JdbcTemplate jdbcTemplate;
    private final ExcepcionMorosidadRepository excepcionRepository;
    private final Clock clock;

    public MorosidadService(JdbcTemplate jdbcTemplate, ExcepcionMorosidadRepository excepcionRepository, Clock clock) {
        this.jdbcTemplate = jdbcTemplate;
        this.excepcionRepository = excepcionRepository;
        this.clock = clock;
    }

    public record EstadoDeuda(int periodosImpagos, int umbral, boolean suspendido) {

        public static final EstadoDeuda SIN_MEMBRESIA = new EstadoDeuda(0, 0, false);
    }

    /** Estado de un período mensual: pagado, impago (venció la gracia) o pendiente (todavía a tiempo). */
    public enum EstadoPeriodo {
        PAGADO,
        IMPAGO,
        PENDIENTE
    }

    /** {@code vence} es el 1° del mes siguiente; {@code limite} es el último día de gracia. */
    public record PeriodoEstado(LocalDate periodo, LocalDate vence, LocalDate limite, EstadoPeriodo estado) {}

    /** Deuda de la persona y, solo si está suspendida, la excepción vigente que la habilita (RN-01, RN-09). */
    public record VeredictoMorosidad(EstadoDeuda deuda, Optional<ExcepcionMorosidad> excepcion) {

        public boolean bloqueado() {
            return deuda.suspendido() && excepcion.isEmpty();
        }
    }

    /** Única fuente de verdad de la suspensión: la usan la reserva, el estado de gimnasio y el estado de cuenta. */
    public VeredictoMorosidad veredicto(Persona persona) {
        EstadoDeuda deuda = evaluar(persona);
        if (!deuda.suspendido()) {
            return new VeredictoMorosidad(deuda, Optional.empty());
        }
        LocalDate hoy = LocalDate.now(clock);
        Optional<ExcepcionMorosidad> excepcion = excepcionRepository.findByPersonaIdOrderByCreadoEnDesc(persona.getId()).stream()
                .filter(e -> e.vigenteEl(hoy))
                .findFirst();
        return new VeredictoMorosidad(deuda, excepcion);
    }

    public EstadoDeuda evaluar(Persona persona) {
        if (!persona.isEsSocioGym() || persona.getFechaInicioMembresia() == null) {
            return EstadoDeuda.SIN_MEMBRESIA;
        }
        Set<LocalDate> pagados = cuotasPagadas(persona);
        Integer umbral = jdbcTemplate.queryForObject(
                "SELECT meses_tolerancia_morosidad FROM configuracion_gym WHERE id = 1", Integer.class);
        int impagos = contarImpagos(persona.getFechaInicioMembresia(), pagados, LocalDate.now(clock));
        return new EstadoDeuda(impagos, umbral, impagos >= umbral);
    }

    /**
     * El período impago más reciente, si hay alguno. Es la marca de los avisos de deuda (RF-37):
     * un aviso por cada período que pasa a impago, nunca dos por el mismo.
     */
    public Optional<LocalDate> ultimoPeriodoImpago(Persona persona) {
        if (!persona.isEsSocioGym() || persona.getFechaInicioMembresia() == null) {
            return Optional.empty();
        }
        return periodos(persona.getFechaInicioMembresia(), cuotasPagadas(persona), LocalDate.now(clock)).stream()
                .filter(p -> p.estado() == EstadoPeriodo.IMPAGO)
                .map(PeriodoEstado::periodo)
                .max(LocalDate::compareTo);
    }

    private Set<LocalDate> cuotasPagadas(Persona persona) {
        return new HashSet<>(jdbcTemplate.queryForList(
                "SELECT periodo FROM pagos WHERE persona_id = ? AND concepto = 'CUOTA_MENSUAL'",
                LocalDate.class,
                persona.getId()));
    }

    /**
     * Cantidad de períodos impagos: un período {@code P} es impago si pasaron más de
     * {@value #DIAS_DE_GRACIA} días desde su vencimiento ({@code P + 1 mes}) y no hay cuota para
     * {@code P}. Un pago posterior no compensa un mes salteado.
     */
    public static int contarImpagos(LocalDate inicioMembresia, Set<LocalDate> periodosPagados, LocalDate hoy) {
        return (int) periodos(inicioMembresia, periodosPagados, hoy).stream()
                .filter(p -> p.estado() == EstadoPeriodo.IMPAGO)
                .count();
    }

    /**
     * Detalle por período desde el mes de inicio, en orden. Un período vencido sin cuota es
     * {@code IMPAGO} recién cuando {@code hoy} es posterior al límite (el día límite todavía es
     * {@code PENDIENTE}). Los períodos futuros sin pago no se listan (un socio nuevo no arranca
     * debiendo); los adelantados pagados sí, como {@code PAGADO}.
     */
    public static List<PeriodoEstado> periodos(LocalDate inicioMembresia, Set<LocalDate> periodosPagados, LocalDate hoy) {
        LocalDate tope = periodosPagados.stream().max(LocalDate::compareTo).filter(m -> m.isAfter(hoy)).orElse(hoy);
        List<PeriodoEstado> resultado = new ArrayList<>();
        for (LocalDate periodo = inicioMembresia.withDayOfMonth(1); !periodo.isAfter(tope); periodo = periodo.plusMonths(1)) {
            LocalDate vence = periodo.plusMonths(1);
            LocalDate limite = vence.plusDays(DIAS_DE_GRACIA);
            if (periodosPagados.contains(periodo)) {
                resultado.add(new PeriodoEstado(periodo, vence, limite, EstadoPeriodo.PAGADO));
            } else if (!periodo.isAfter(hoy)) {
                EstadoPeriodo estado = hoy.isAfter(limite) ? EstadoPeriodo.IMPAGO : EstadoPeriodo.PENDIENTE;
                resultado.add(new PeriodoEstado(periodo, vence, limite, estado));
            }
        }
        return Collections.unmodifiableList(resultado);
    }
}
