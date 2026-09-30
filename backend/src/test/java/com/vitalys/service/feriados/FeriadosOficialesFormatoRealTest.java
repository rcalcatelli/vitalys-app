package com.vitalys.service.feriados;

import static org.assertj.core.api.Assertions.assertThat;

import com.sun.net.httpserver.HttpServer;
import com.vitalys.config.FeriadosProperties;
import com.vitalys.domain.TipoFeriado;
import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * Prueba el parser contra el <strong>archivo real</strong> del Ministerio del Interior, guardado
 * como fixture ({@code src/test/resources/feriados-2026-oficial.json}, descargado el 28/09/2026).
 *
 * <p>Los otros tests del cliente usan documentos armados a mano y verifican el manejo de casos
 * raros. Este verifica lo contrario: que el formato que efectivamente publica el Estado se lea
 * bien. Si la fuente cambia de estructura, este test es el que avisa — y avisa sin salir a
 * internet, porque el fixture está versionado.
 *
 * <p>Para actualizarlo:
 *
 * <pre>curl -s https://www.argentina.gob.ar/sites/default/files/holidays-2026-es.json \
 *   -o src/test/resources/feriados-2026-oficial.json</pre>
 */
class FeriadosOficialesFormatoRealTest {

    private HttpServer servidor;
    private FeriadosOficialesClient cliente;

    @BeforeEach
    void setUp() throws IOException {
        byte[] fixture;
        try (var entrada = getClass().getResourceAsStream("/feriados-2026-oficial.json")) {
            assertThat(entrada).as("fixture del calendario oficial 2026").isNotNull();
            fixture = entrada.readAllBytes();
        }

        servidor = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        servidor.createContext(
                "/",
                intercambio -> {
                    intercambio.getResponseHeaders().add("Content-Type", "application/json");
                    intercambio.sendResponseHeaders(200, fixture.length);
                    try (OutputStream salida = intercambio.getResponseBody()) {
                        salida.write(fixture);
                    }
                });
        servidor.start();

        FeriadosProperties propiedades = new FeriadosProperties();
        propiedades.setUrlPlantilla(
                "http://127.0.0.1:" + servidor.getAddress().getPort() + "/holidays-{anio}-es.json");
        propiedades.setTimeoutSegundos(5);
        cliente = new FeriadosOficialesClient(propiedades);
    }

    @AfterEach
    void tearDown() {
        if (servidor != null) {
            servidor.stop(0);
        }
    }

    @Test
    void lee_el_archivo_oficial_completo() {
        List<FeriadoOficial> feriados = cliente.obtenerAnio(2026);

        // 35 elementos en el archivo; se descarta el 01/01/2027, que pertenece al año siguiente.
        assertThat(feriados).hasSize(34);
        assertThat(feriados).allSatisfy(f -> assertThat(f.fecha().getYear()).isEqualTo(2026));
        assertThat(feriados).allSatisfy(f -> assertThat(f.nombre()).isNotBlank());
        assertThat(feriados).allSatisfy(f -> assertThat(f.tipo()).isNotNull());
    }

    @Test
    void reconoce_los_cuatro_tipos_que_publica_la_fuente() {
        Map<TipoFeriado, Long> porTipo =
                cliente.obtenerAnio(2026).stream()
                        .collect(Collectors.groupingBy(FeriadoOficial::tipo, Collectors.counting()));

        assertThat(porTipo).containsOnlyKeys(TipoFeriado.values());
        assertThat(porTipo.get(TipoFeriado.TRASLADABLE)).isEqualTo(4L);
        assertThat(porTipo.get(TipoFeriado.TURISTICO)).isEqualTo(3L);
    }

    @Test
    void los_trasladables_caen_en_la_fecha_corrida_y_no_en_la_nominal() {
        List<LocalDate> fechas = cliente.obtenerAnio(2026).stream().map(FeriadoOficial::fecha).toList();

        // Güemes es el 17/06 por ley; en 2026 el decreto lo corrió al 15/06.
        assertThat(fechas).contains(LocalDate.of(2026, 6, 15));
        // Soberanía Nacional es el 20/11; en 2026 cayó el 23/11.
        assertThat(fechas).contains(LocalDate.of(2026, 11, 23));
        assertThat(fechas).doesNotContain(LocalDate.of(2026, 11, 20));
    }

    @Test
    void incluye_un_feriado_creado_por_decreto() {
        // El 09/11/2026 no existe en ninguna ley de feriados: se declaró por la visita papal.
        // Es el caso que justifica sincronizar contra la fuente en vez de cargar una lista fija.
        assertThat(cliente.obtenerAnio(2026))
                .anySatisfy(
                        f -> {
                            assertThat(f.fecha()).isEqualTo(LocalDate.of(2026, 11, 9));
                            assertThat(f.tipo()).isEqualTo(TipoFeriado.INAMOVIBLE);
                        });
    }

    @Test
    void las_festividades_religiosas_vienen_como_no_laborables() {
        // No cierran el gimnasio: rigen para quien las profesa (TipoFeriado#implicaCierre).
        assertThat(cliente.obtenerAnio(2026))
                .filteredOn(f -> f.tipo() == TipoFeriado.NO_LABORABLE)
                .isNotEmpty()
                .allSatisfy(f -> assertThat(f.tipo().implicaCierre()).isFalse());
    }
}
