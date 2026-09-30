package com.vitalys.service.feriados;

import com.fasterxml.jackson.databind.JsonNode;
import com.vitalys.config.FeriadosProperties;
import com.vitalys.domain.TipoFeriado;
import java.time.Duration;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

/**
 * Lee el calendario de feriados del dataset oficial del Ministerio del Interior, catalogado en
 * {@code datos.gob.ar} (RF-38):
 *
 * <pre>https://www.argentina.gob.ar/sites/default/files/holidays-{anio}-es.json</pre>
 *
 * <p>El archivo es JSON-LD de schema.org: un {@code ItemList} donde cada elemento trae
 * {@code startDate}, {@code name} y un {@code additionalProperty} con el tipo de feriado. Esta
 * clase es la única que conoce esa forma; hacia adentro devuelve {@link FeriadoOficial}.
 *
 * <p>Nada de esto se consulta al reservar un turno: la reserva lee la tabla {@code feriados}. Si
 * la fuente no responde, el gimnasio tiene que poder seguir vendiendo turnos.
 */
@Component
public class FeriadosOficialesClient {

    private static final Logger log = LoggerFactory.getLogger(FeriadosOficialesClient.class);

    private final FeriadosProperties propiedades;
    private final RestClient restClient;

    public FeriadosOficialesClient(FeriadosProperties propiedades) {
        this.propiedades = propiedades;

        SimpleClientHttpRequestFactory fabrica = new SimpleClientHttpRequestFactory();
        Duration timeout = Duration.ofSeconds(propiedades.getTimeoutSegundos());
        fabrica.setConnectTimeout(timeout);
        fabrica.setReadTimeout(timeout);

        this.restClient = RestClient.builder().requestFactory(fabrica).build();
    }

    /**
     * Descarga y normaliza los feriados de un año.
     *
     * @return los feriados de ese año, sin duplicados de fecha resueltos (eso lo hace el
     *     sincronizador) y filtrando las fechas de otros años que el archivo pueda incluir — el de
     *     2026, por ejemplo, trae el 01/01/2027.
     * @throws FeriadosNoDisponiblesException si la fuente no responde o devuelve algo que no se
     *     puede interpretar. Nunca devuelve una lista vacía para disimular un error: vaciar el
     *     calendario por una caída del servicio abriría el gimnasio un feriado.
     */
    public List<FeriadoOficial> obtenerAnio(int anio) {
        String url = propiedades.getUrlPlantilla().replace("{anio}", String.valueOf(anio));

        JsonNode raiz;
        try {
            raiz = restClient.get().uri(url).retrieve().body(JsonNode.class);
        } catch (RuntimeException e) {
            throw new FeriadosNoDisponiblesException(
                    "No se pudo leer el calendario oficial de %d desde %s".formatted(anio, url), e);
        }

        if (raiz == null) {
            throw new FeriadosNoDisponiblesException(
                    "El calendario oficial de %d llegó vacío desde %s".formatted(anio, url));
        }

        JsonNode elementos = raiz.path("mainEntity").path("itemListElement");
        if (!elementos.isArray() || elementos.isEmpty()) {
            throw new FeriadosNoDisponiblesException(
                    ("El calendario oficial de %d no tiene mainEntity.itemListElement: "
                                    + "la fuente cambió de formato")
                            .formatted(anio));
        }

        List<FeriadoOficial> feriados = new ArrayList<>();
        for (JsonNode elemento : elementos) {
            FeriadoOficial feriado = leerItem(elemento.path("item"), anio);
            if (feriado != null) {
                feriados.add(feriado);
            }
        }

        if (feriados.isEmpty()) {
            throw new FeriadosNoDisponiblesException(
                    ("El calendario oficial de %d trajo %d elementos pero ninguno interpretable: "
                                    + "la fuente cambió de formato")
                            .formatted(anio, elementos.size()));
        }

        log.info("Calendario oficial {}: {} feriados leídos de {}", anio, feriados.size(), url);
        return feriados;
    }

    /** {@code null} si el elemento no se puede interpretar; se descarta en lugar de adivinar. */
    private FeriadoOficial leerItem(JsonNode item, int anio) {
        String startDate = item.path("startDate").asText(null);
        String nombre = item.path("name").asText(null);
        if (startDate == null || nombre == null || nombre.isBlank()) {
            log.warn("Feriado sin startDate o name en el calendario {}: {}", anio, item);
            return null;
        }

        LocalDate fecha;
        try {
            fecha = LocalDate.parse(startDate);
        } catch (DateTimeParseException e) {
            log.warn("Fecha ilegible '{}' en el calendario {}", startDate, anio);
            return null;
        }

        // El archivo de un año puede incluir fechas del siguiente (el de 2026 trae el 01/01/2027).
        // Se descartan acá: cada año se sincroniza contra su propio archivo.
        if (fecha.getYear() != anio) {
            return null;
        }

        TipoFeriado tipo = TipoFeriado.desdeValorOficial(leerTipo(item));
        if (tipo == null) {
            log.warn(
                    "Tipo de feriado desconocido para '{}' ({}) en el calendario {}; se descarta",
                    nombre,
                    fecha,
                    anio);
            return null;
        }

        return new FeriadoOficial(fecha, nombre.trim(), tipo);
    }

    /**
     * {@code additionalProperty} viene como objeto único en el archivo de 2026, pero schema.org
     * admite una lista. Se contemplan las dos formas para que un cambio de la fuente no rompa la
     * sincronización.
     */
    private String leerTipo(JsonNode item) {
        JsonNode propiedad = item.path("additionalProperty");

        if (propiedad.isArray()) {
            for (JsonNode candidata : propiedad) {
                if ("tipo".equalsIgnoreCase(candidata.path("name").asText(""))) {
                    return candidata.path("value").asText(null);
                }
            }
            return null;
        }

        return propiedad.path("value").asText(null);
    }
}
