package com.vitalys.integration;

import static org.assertj.core.api.Assertions.assertThat;

import com.vitalys.service.MorosidadService;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

/**
 * Los comentarios de {@code db/dml/seed.sql} prometen un caso de prueba por persona (al día,
 * socia nueva, deuda por debajo del umbral, suspendido con excepción). Este test los convierte en
 * aserciones: carga el seed en una base propia, recién migrada, y verifica que cada persona dé el
 * resultado que su comentario dice, con la fecha real del día en que corre el CI.
 *
 * <p>Usa una base aparte dentro del mismo contenedor para no mezclar las filas fijas del seed
 * (DNI, emails, feriados) con las de los demás tests de integración.
 */
class SeedIT {

    private static final ZoneId ZONA = ZoneId.of("America/Argentina/Buenos_Aires");
    private static final String BASE = "seed_it";

    private static JdbcTemplate jdbc;

    @BeforeAll
    static void cargarSeed() throws Exception {
        var pg = IntegrationTestBase.POSTGRES;
        try (Connection admin = DriverManager.getConnection(pg.getJdbcUrl(), pg.getUsername(), pg.getPassword());
                Statement st = admin.createStatement()) {
            st.execute("DROP DATABASE IF EXISTS " + BASE);
            st.execute("CREATE DATABASE " + BASE);
        }
        String url = pg.getJdbcUrl().replaceFirst("/[^/?]+(\\?|$)", "/" + BASE + "$1");
        Flyway.configure()
                .dataSource(url, pg.getUsername(), pg.getPassword())
                .locations("classpath:db/migration")
                .load()
                .migrate();

        String seed = Files.readString(Path.of("..", "db", "dml", "seed.sql"), StandardCharsets.UTF_8);
        try (Connection c = DriverManager.getConnection(url, pg.getUsername(), pg.getPassword());
                Statement st = c.createStatement()) {
            st.execute(seed);
        }
        jdbc = new JdbcTemplate(new DriverManagerDataSource(url, pg.getUsername(), pg.getPassword()));
    }

    private static LocalDate hoy() {
        return LocalDate.now(ZONA);
    }

    private static int impagos(String dni) {
        LocalDate inicio = jdbc.queryForObject(
                "SELECT fecha_inicio_membresia FROM personas WHERE dni = ?", LocalDate.class, dni);
        Set<LocalDate> pagados = new HashSet<>(jdbc.queryForList(
                "SELECT pa.periodo FROM pagos pa JOIN personas p ON p.id = pa.persona_id "
                        + "WHERE p.dni = ? AND pa.concepto = 'CUOTA_MENSUAL'",
                LocalDate.class,
                dni));
        return MorosidadService.contarImpagos(inicio, pagados, hoy());
    }

    private static int umbral() {
        return jdbc.queryForObject("SELECT meses_tolerancia_morosidad FROM configuracion_gym WHERE id = 1", Integer.class);
    }

    @Test
    void mariaEstaAlDia() {
        assertThat(impagos("38100001")).isZero();
    }

    @Test
    void luciaEsSociaNuevaSinDeuda() {
        assertThat(impagos("38100003")).isZero();
        assertThat(jdbc.queryForObject(
                        "SELECT COUNT(*) FROM pagos pa JOIN personas p ON p.id = pa.persona_id WHERE p.dni = '38100003'",
                        Integer.class))
                .isZero();
    }

    @Test
    void anaTieneDeudaPeroPorDebajoDelUmbral() {
        assertThat(impagos("38100005")).isEqualTo(2).isLessThan(umbral());
    }

    @Test
    void juanEstaSuspendidoYSoloLoHabilitaSuExcepcionVigente() {
        assertThat(impagos("38100002")).isEqualTo(umbral());
        List<LocalDate> vigentes = jdbc.queryForList(
                "SELECT e.valida_hasta FROM excepciones_morosidad e JOIN personas p ON p.id = e.persona_id "
                        + "WHERE p.dni = '38100002' AND e.valida_hasta >= ? AND (NOT e.un_solo_uso OR e.turno_id IS NULL)",
                LocalDate.class,
                hoy());
        assertThat(vigentes).hasSize(1);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM excepciones_morosidad", Integer.class)).isEqualTo(1);
    }

    @Test
    void losReservadosQuedanEnElFuturoYLosCerradosEnElPasado() {
        Integer inconsistentes = jdbc.queryForObject(
                "SELECT COUNT(*) FROM turnos WHERE (estado = 'RESERVADO') <> (inicio > NOW())", Integer.class);
        assertThat(inconsistentes).isZero();
        assertThat(jdbc.queryForObject("SELECT COUNT(DISTINCT estado) FROM turnos", Integer.class)).isEqualTo(5);
    }

    @Test
    void carlosSoloConsultorioYPedroDadoDeBaja() {
        assertThat(jdbc.queryForObject("SELECT es_socio_gym FROM personas WHERE dni = '38100004'", Boolean.class)).isFalse();
        assertThat(jdbc.queryForObject("SELECT estado::text FROM personas WHERE dni = '38100006'", String.class))
                .isEqualTo("INACTIVO");
    }
}
