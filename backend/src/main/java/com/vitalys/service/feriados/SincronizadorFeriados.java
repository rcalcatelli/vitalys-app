package com.vitalys.service.feriados;

import com.vitalys.config.FeriadosProperties;
import com.vitalys.domain.Feriado;
import com.vitalys.domain.OrigenFeriado;
import com.vitalys.domain.TipoFeriado;
import com.vitalys.repository.FeriadoRepository;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Mantiene la tabla {@code feriados} al día contra el dataset oficial (RF-38).
 *
 * <p><strong>Por qué hace falta un job y no una carga única.</strong> El calendario argentino
 * cambia después de publicado: los feriados trasladables se corren por decreto anual y pueden
 * declararse feriados nuevos en cualquier momento — en 2026, el 09/11 por la visita papal. Un
 * calendario cargado una sola vez queda desactualizado sin que nadie se entere, y el gimnasio
 * termina vendiendo turnos para un día en que no abre.
 *
 * <p><strong>Qué toca y qué no.</strong> Solo las filas {@code OFICIAL}. Las {@code MANUAL} —un
 * feriado provincial, un cierre por mantenimiento— son del ADMIN y el sincronizador no las mira,
 * ni para actualizarlas ni para darlas de baja.
 *
 * <p><strong>Ante un error, no toca nada.</strong> Cada año se sincroniza por separado y dentro de
 * su propia transacción: si la fuente no responde para 2027, el calendario de 2027 queda como
 * estaba y el de 2026 se sincroniza igual. Nunca se interpreta "no pude leer" como "no hay
 * feriados", porque eso vaciaría el calendario y abriría el gimnasio un feriado.
 */
@Service
public class SincronizadorFeriados {

    private static final Logger log = LoggerFactory.getLogger(SincronizadorFeriados.class);

    private final FeriadosOficialesClient client;
    private final FeriadoRepository repositorio;
    private final FeriadosProperties propiedades;

    public SincronizadorFeriados(
            FeriadosOficialesClient client,
            FeriadoRepository repositorio,
            FeriadosProperties propiedades) {
        this.client = client;
        this.repositorio = repositorio;
        this.propiedades = propiedades;
    }

    /** Sincroniza el año en curso y los siguientes, según {@code aniosASincronizar}. */
    public ResultadoSincronizacion sincronizar() {
        int anioActual = LocalDate.now(ZoneId.of(propiedades.getZona())).getYear();
        List<Integer> anios = new ArrayList<>();
        for (int i = 0; i < propiedades.getAniosASincronizar(); i++) {
            anios.add(anioActual + i);
        }
        return sincronizarAnios(anios);
    }

    /** Sincroniza los años indicados. Un año que falle no impide que los demás se sincronicen. */
    public ResultadoSincronizacion sincronizarAnios(List<Integer> anios) {
        int altas = 0;
        int modificaciones = 0;
        int bajas = 0;
        int sinCambios = 0;
        List<String> errores = new ArrayList<>();

        for (Integer anio : anios) {
            try {
                ResultadoSincronizacion parcial = sincronizarAnio(anio);
                altas += parcial.altas();
                modificaciones += parcial.modificaciones();
                bajas += parcial.bajas();
                sinCambios += parcial.sinCambios();
            } catch (FeriadosNoDisponiblesException e) {
                // El calendario de ese año queda intacto. Se registra y se sigue con el resto.
                log.error("No se pudo sincronizar el calendario de {}: {}", anio, e.getMessage());
                errores.add("%d: %s".formatted(anio, e.getMessage()));
            }
        }

        ResultadoSincronizacion resultado =
                new ResultadoSincronizacion(anios, altas, modificaciones, bajas, sinCambios, errores);

        if (resultado.huboCambios()) {
            log.warn("Calendario de feriados actualizado — {}", resultado.resumen());
        } else {
            log.info("Calendario de feriados sin cambios — {}", resultado.resumen());
        }
        return resultado;
    }

    /**
     * Sincroniza un año en una transacción propia: o queda entero, o no queda nada de ese año.
     *
     * <p>Es {@code public} porque el {@code @Transactional} de Spring se aplica por proxy y no
     * tendría efecto si {@link #sincronizarAnios} la llamara como método privado del mismo objeto.
     */
    @Transactional
    public ResultadoSincronizacion sincronizarAnio(int anio) {
        List<FeriadoOficial> oficiales = client.obtenerAnio(anio);
        Map<LocalDate, FeriadoOficial> porFecha = resolverFechasRepetidas(oficiales);

        LocalDate desde = LocalDate.of(anio, 1, 1);
        LocalDate hasta = LocalDate.of(anio, 12, 31);
        OffsetDateTime ahora = OffsetDateTime.now();

        Map<LocalDate, Feriado> existentes = new HashMap<>();
        for (Feriado f : repositorio.findPorOrigenEntreFechas(OrigenFeriado.OFICIAL, desde, hasta)) {
            existentes.put(f.getFecha(), f);
        }

        int altas = 0;
        int modificaciones = 0;
        int sinCambios = 0;

        for (FeriadoOficial oficial : porFecha.values()) {
            Feriado existente = existentes.get(oficial.fecha());

            if (existente == null) {
                // Puede haber una fila MANUAL en esa fecha: el ADMIN ya declaró algo ahí y su
                // criterio manda. No se pisa.
                if (repositorio.existsById(oficial.fecha())) {
                    log.info(
                            "El {} ya tiene un feriado cargado a mano; no se sobrescribe con '{}'",
                            oficial.fecha(),
                            oficial.nombre());
                    continue;
                }
                repositorio.save(
                        Feriado.oficial(oficial.fecha(), oficial.nombre(), oficial.tipo(), ahora));
                log.info("Feriado nuevo: {} {} ({})", oficial.fecha(), oficial.nombre(), oficial.tipo());
                altas++;
                continue;
            }

            boolean cambio =
                    !existente.getDescripcion().equals(oficial.nombre())
                            || existente.getTipo() != oficial.tipo();

            existente.actualizarDesdeOficial(oficial.nombre(), oficial.tipo(), ahora);
            repositorio.save(existente);

            if (cambio) {
                log.info(
                        "Feriado modificado: {} -> '{}' ({})",
                        oficial.fecha(),
                        oficial.nombre(),
                        oficial.tipo());
                modificaciones++;
            } else {
                sinCambios++;
            }
        }

        // Bajas: lo que está cargado como OFICIAL y ya no figura en la fuente. Un trasladable que
        // se corrió de fecha entra por acá (baja en la vieja, alta en la nueva).
        int bajas = 0;
        for (Feriado existente : existentes.values()) {
            if (!porFecha.containsKey(existente.getFecha())) {
                log.info(
                        "Feriado dado de baja: {} '{}' ya no figura en el calendario oficial",
                        existente.getFecha(),
                        existente.getDescripcion());
                repositorio.delete(existente);
                bajas++;
            }
        }

        return new ResultadoSincronizacion(
                List.of(anio), altas, modificaciones, bajas, sinCambios, List.of());
    }

    /**
     * La fuente puede listar varias festividades el mismo día — el 02/04/2026 aparece como feriado
     * inamovible por Malvinas y además como Jueves Santo y como Pascua judía. {@code feriados.fecha}
     * es clave primaria, así que se conserva la de mayor peso: si ese día hay un feriado nacional,
     * el gimnasio no abre, sin importar que también sea una festividad religiosa.
     */
    private Map<LocalDate, FeriadoOficial> resolverFechasRepetidas(List<FeriadoOficial> oficiales) {
        Map<LocalDate, FeriadoOficial> porFecha = new HashMap<>();
        for (FeriadoOficial candidato : oficiales) {
            FeriadoOficial actual = porFecha.get(candidato.fecha());
            TipoFeriado tipoActual = actual == null ? null : actual.tipo();
            if (candidato.tipo().superaA(tipoActual)) {
                porFecha.put(candidato.fecha(), candidato);
            }
        }
        return porFecha;
    }
}
