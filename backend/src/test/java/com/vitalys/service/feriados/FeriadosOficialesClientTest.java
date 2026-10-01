package com.vitalys.service.feriados;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.sun.net.httpserver.HttpServer;
import com.vitalys.config.FeriadosProperties;
import com.vitalys.domain.TipoFeriado;
import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

/**
 * Prueba el parseo del JSON-LD de la fuente oficial contra un servidor local. No sale a internet:
 * un test que depende de que argentina.gob.ar responda no es un test, es un monitoreo.
 */
class FeriadosOficialesClientTest {

    private HttpServer servidor;

    @AfterEach
    void tearDown() {
        if (servidor != null) {
            servidor.stop(0);
        }
    }

    /** Levanta un servidor local que responde {@code cuerpo} con el código dado. */
    private FeriadosOficialesClient clienteQueRecibe(int codigo, String cuerpo) throws IOException {
        servidor = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        servidor.createContext(
                "/",
                intercambio -> {
                    byte[] bytes = cuerpo.getBytes(StandardCharsets.UTF_8);
                    intercambio.getResponseHeaders().add("Content-Type", "application/json");
                    intercambio.sendResponseHeaders(codigo, bytes.length);
                    try (OutputStream salida = intercambio.getResponseBody()) {
                        salida.write(bytes);
                    }
                });
        servidor.start();

        FeriadosProperties propiedades = new FeriadosProperties();
        propiedades.setUrlPlantilla(
                "http://127.0.0.1:" + servidor.getAddress().getPort() + "/holidays-{anio}-es.json");
        propiedades.setTimeoutSegundos(5);
        return new FeriadosOficialesClient(propiedades);
    }

    /** Un item con el formato real de la fuente: additionalProperty como objeto. */
    private String item(String fecha, String nombre, String tipo) {
        return """
            {"item":{"name":"%s","startDate":"%s",
             "additionalProperty":{"name":"tipo","value":"%s","@type":"PropertyValue"}}}
            """
                .formatted(nombre, fecha, tipo);
    }

    private String documento(String... items) {
        return "{\"mainEntity\":{\"itemListElement\":[" + String.join(",", items) + "]}}";
    }

    @Test
    void lee_el_formato_real_de_la_fuente() throws IOException {
        FeriadosOficialesClient cliente =
                clienteQueRecibe(
                        200,
                        documento(
                                item("2026-01-01", "Año Nuevo", "inamovible"),
                                item("2026-11-23", "Día de la Soberanía Nacional (20/11)", "trasladable"),
                                item("2026-12-07", "Día no laborable con fines turísticos", "turistico"),
                                item("2026-09-21", "Día del Perdón", "no_laborable")));

        List<FeriadoOficial> feriados = cliente.obtenerAnio(2026);

        assertThat(feriados).hasSize(4);
        assertThat(feriados.get(0))
                .isEqualTo(new FeriadoOficial(LocalDate.of(2026, 1, 1), "Año Nuevo", TipoFeriado.INAMOVIBLE));
        assertThat(feriados)
                .extracting(FeriadoOficial::tipo)
                .containsExactly(
                        TipoFeriado.INAMOVIBLE,
                        TipoFeriado.TRASLADABLE,
                        TipoFeriado.TURISTICO,
                        TipoFeriado.NO_LABORABLE);
    }

    @Test
    void descarta_las_fechas_de_otro_anio() throws IOException {
        // El archivo de 2026 incluye el 01/01/2027; cada año se sincroniza contra su archivo.
        FeriadosOficialesClient cliente =
                clienteQueRecibe(
                        200,
                        documento(
                                item("2026-12-25", "Navidad", "inamovible"),
                                item("2027-01-01", "Año nuevo", "inamovible")));

        List<FeriadoOficial> feriados = cliente.obtenerAnio(2026);

        assertThat(feriados).hasSize(1);
        assertThat(feriados.get(0).fecha()).isEqualTo(LocalDate.of(2026, 12, 25));
    }

    @Test
    void acepta_additional_property_como_lista() throws IOException {
        String itemConLista =
                """
                {"item":{"name":"Navidad","startDate":"2026-12-25",
                 "additionalProperty":[{"name":"otra","value":"x"},{"name":"tipo","value":"inamovible"}]}}
                """;
        FeriadosOficialesClient cliente = clienteQueRecibe(200, documento(itemConLista));

        assertThat(cliente.obtenerAnio(2026)).hasSize(1);
    }

    @Test
    void descarta_un_item_sin_tipo_reconocible_pero_conserva_el_resto() throws IOException {
        FeriadosOficialesClient cliente =
                clienteQueRecibe(
                        200,
                        documento(
                                item("2026-12-25", "Navidad", "inamovible"),
                                item("2026-12-08", "Algo", "categoria_nueva")));

        List<FeriadoOficial> feriados = cliente.obtenerAnio(2026);

        assertThat(feriados).hasSize(1);
        assertThat(feriados.get(0).nombre()).isEqualTo("Navidad");
    }

    @Test
    void descarta_un_item_sin_fecha_o_sin_nombre() throws IOException {
        FeriadosOficialesClient cliente =
                clienteQueRecibe(
                        200,
                        documento(
                                item("2026-12-25", "Navidad", "inamovible"),
                                "{\"item\":{\"name\":\"Sin fecha\"}}",
                                "{\"item\":{\"startDate\":\"2026-05-01\"}}",
                                item("no-es-una-fecha", "Ilegible", "inamovible")));

        assertThat(cliente.obtenerAnio(2026)).hasSize(1);
    }

    @Test
    void falla_si_la_fuente_devuelve_un_error() throws IOException {
        FeriadosOficialesClient cliente = clienteQueRecibe(500, "{}");

        assertThatThrownBy(() -> cliente.obtenerAnio(2026))
                .isInstanceOf(FeriadosNoDisponiblesException.class)
                .hasMessageContaining("2026");
    }

    @Test
    void falla_si_la_fuente_cambio_de_formato() throws IOException {
        FeriadosOficialesClient cliente = clienteQueRecibe(200, "{\"otraCosa\":[]}");

        assertThatThrownBy(() -> cliente.obtenerAnio(2026))
                .isInstanceOf(FeriadosNoDisponiblesException.class)
                .hasMessageContaining("formato");
    }

    @Test
    void falla_si_ningun_item_es_interpretable() throws IOException {
        // Distinto de "no hay feriados": si todo vino mal, es un cambio de formato, no un año
        // sin feriados. Devolver una lista vacía vaciaría el calendario.
        FeriadosOficialesClient cliente =
                clienteQueRecibe(200, documento("{\"item\":{}}", "{\"item\":{}}"));

        assertThatThrownBy(() -> cliente.obtenerAnio(2026))
                .isInstanceOf(FeriadosNoDisponiblesException.class)
                .hasMessageContaining("formato");
    }

    @Test
    void falla_si_no_puede_conectarse() {
        FeriadosProperties propiedades = new FeriadosProperties();
        propiedades.setUrlPlantilla("http://127.0.0.1:1/holidays-{anio}-es.json");
        propiedades.setTimeoutSegundos(2);

        assertThatThrownBy(() -> new FeriadosOficialesClient(propiedades).obtenerAnio(2026))
                .isInstanceOf(FeriadosNoDisponiblesException.class);
    }
}
