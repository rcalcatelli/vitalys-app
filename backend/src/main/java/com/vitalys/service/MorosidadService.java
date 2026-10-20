package com.vitalys.service;

import com.vitalys.domain.Persona;
import java.time.Clock;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.Set;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/**
 * RN-01: deuda de gimnasio como cantidad de períodos mensuales impagos desde
 * {@code fecha_inicio_membresia}, y suspensión al alcanzar el umbral configurable.
 *
 * <p>Lee {@code pagos} y {@code configuracion_gym} con SQL directo porque la entidad
 * {@code Pago} es del Módulo 5: cuando exista, {@code PagoService} puede reutilizar
 * {@link #contarImpagos} para el estado de cuenta sin duplicar la regla.
 */
@Service
public class MorosidadService {

    /** Días de gracia después del vencimiento (1° del mes siguiente al período). */
    static final int DIAS_DE_GRACIA = 10;

    private final JdbcTemplate jdbcTemplate;
    private final Clock clock;

    public MorosidadService(JdbcTemplate jdbcTemplate, Clock clock) {
        this.jdbcTemplate = jdbcTemplate;
        this.clock = clock;
    }

    public record EstadoDeuda(int periodosImpagos, int umbral, boolean suspendido) {

        public static final EstadoDeuda SIN_MEMBRESIA = new EstadoDeuda(0, 0, false);
    }

    public EstadoDeuda evaluar(Persona persona) {
        if (!persona.isEsSocioGym() || persona.getFechaInicioMembresia() == null) {
            return EstadoDeuda.SIN_MEMBRESIA;
        }
        Set<LocalDate> pagados = new HashSet<>(jdbcTemplate.queryForList(
                "SELECT periodo FROM pagos WHERE persona_id = ? AND concepto = 'CUOTA_MENSUAL'",
                LocalDate.class,
                persona.getId()));
        Integer umbral = jdbcTemplate.queryForObject(
                "SELECT meses_tolerancia_morosidad FROM configuracion_gym WHERE id = 1", Integer.class);
        int impagos = contarImpagos(persona.getFechaInicioMembresia(), pagados, LocalDate.now(clock));
        return new EstadoDeuda(impagos, umbral, impagos >= umbral);
    }

    /**
     * Recorre los períodos desde el mes de inicio de la membresía. Un período {@code P} es
     * impago si pasaron más de {@value #DIAS_DE_GRACIA} días desde su vencimiento
     * ({@code P + 1 mes}) y no hay cuota para {@code P}. Un pago posterior no compensa un mes
     * salteado. Un período que todavía no venció no cuenta: un socio nuevo no arranca debiendo.
     */
    public static int contarImpagos(LocalDate inicioMembresia, Set<LocalDate> periodosPagados, LocalDate hoy) {
        int impagos = 0;
        for (LocalDate periodo = inicioMembresia.withDayOfMonth(1);
                !periodo.isAfter(hoy);
                periodo = periodo.plusMonths(1)) {
            LocalDate limite = periodo.plusMonths(1).plusDays(DIAS_DE_GRACIA);
            if (hoy.isAfter(limite) && !periodosPagados.contains(periodo)) {
                impagos++;
            }
        }
        return impagos;
    }
}
