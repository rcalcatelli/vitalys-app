package com.vitalys.integration;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * Elige días en los que un IT puede reservar gimnasio sin chocar con RN-18 (hasta 7 días de
 * anticipación) ni con la grilla (sin sábados, domingos ni feriados que cierran el gimnasio).
 *
 * <p>Se mira solo hasta {@link #HORIZONTE_DIAS} días hacia adelante: el último día elegible es hoy + 6,
 * que a cualquier hora de la grilla queda dentro de los 7 días de {@code ahora}, sin importar a
 * qué hora corra el test. Si el n-ésimo día hábil no entra en la ventana (fin de semana largo con
 * feriados), se cae al último día hábil que sí entra, en vez de salirse de RN-18 y fallar de forma
 * intermitente según la fecha de ejecución.
 */
final class DiasDeReserva {

    static final ZoneId ZONA = ZoneId.of("America/Argentina/Buenos_Aires");
    static final int HORIZONTE_DIAS = 6;

    private DiasDeReserva() {}

    /** El {@code n}-ésimo (desde 1) día hábil no feriado a partir de mañana, dentro de la ventana de RN-18. */
    static LocalDate diaHabil(JdbcTemplate jdbcTemplate, int n) {
        LocalDate hoy = LocalDate.now(ZONA);
        List<LocalDate> validos = new ArrayList<>();
        for (int i = 1; i <= HORIZONTE_DIAS; i++) {
            LocalDate d = hoy.plusDays(i);
            boolean finDeSemana = d.getDayOfWeek() == DayOfWeek.SATURDAY || d.getDayOfWeek() == DayOfWeek.SUNDAY;
            if (!finDeSemana
                    && jdbcTemplate.queryForObject("SELECT COUNT(*) FROM feriados WHERE fecha = ?", Integer.class, d) == 0) {
                validos.add(d);
            }
        }
        assertThat(validos).as("hay al menos un día hábil no feriado en los próximos %d días", HORIZONTE_DIAS).isNotEmpty();
        LocalDate elegido = validos.get(Math.min(n, validos.size()) - 1);
        assertThat(elegido).as("el día elegido respeta la anticipación máxima de RN-18").isBefore(hoy.plusDays(HORIZONTE_DIAS + 1));
        return elegido;
    }
}
