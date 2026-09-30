package com.vitalys.controller;

import com.vitalys.domain.Feriado;
import com.vitalys.repository.FeriadoRepository;
import com.vitalys.service.feriados.ResultadoSincronizacion;
import com.vitalys.service.feriados.SincronizadorFeriados;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.LocalDate;
import java.time.Year;
import java.util.List;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Calendario de días en que el gimnasio no abre (RN-14, RF-38).
 *
 * <p>La sincronización normal la dispara el job de las 03:00; este endpoint existe para forzarla
 * cuando se declara un feriado por decreto y no se quiere esperar hasta el día siguiente.
 */
@RestController
@Tag(name = "Feriados", description = "Días en que el gimnasio no abre (RN-14)")
public class FeriadoController {

    private final FeriadoRepository repositorio;
    private final SincronizadorFeriados sincronizador;

    public FeriadoController(FeriadoRepository repositorio, SincronizadorFeriados sincronizador) {
        this.repositorio = repositorio;
        this.sincronizador = sincronizador;
    }

    @GetMapping("/api/feriados")
    @Operation(
            summary = "Feriados de un año",
            description =
                    "Días no laborables cargados, con su tipo y si cierran el gimnasio. "
                            + "Lo consume la pantalla de reserva para no ofrecer franjas en un día cerrado.")
    @ApiResponse(responseCode = "200", description = "Listado del año pedido")
    public List<Map<String, Object>> listar(
            @RequestParam(name = "anio", required = false) Integer anio) {
        int año = anio != null ? anio : Year.now().getValue();
        return repositorio
                .findEntreFechas(LocalDate.of(año, 1, 1), LocalDate.of(año, 12, 31))
                .stream()
                .map(FeriadoController::aRespuesta)
                .toList();
    }

    @PostMapping("/api/admin/feriados/sincronizar")
    @Operation(
            summary = "Forzar la sincronización con la fuente oficial",
            description =
                    "Solo ADMIN. Lee el dataset del Ministerio del Interior y actualiza la tabla. "
                            + "Las filas cargadas a mano (origen MANUAL) no se tocan. Si la fuente no "
                            + "responde, el calendario queda como estaba y se informa el error.")
    @ApiResponse(responseCode = "200", description = "Sincronización completa")
    @ApiResponse(responseCode = "207", description = "Sincronización parcial: algún año no se pudo leer")
    public ResponseEntity<ResultadoSincronizacion> sincronizar() {
        ResultadoSincronizacion resultado = sincronizador.sincronizar();
        // 207 Multi-Status: parte de los años se sincronizó y parte no. Un 200 ocultaría que el
        // calendario de un año quedó viejo.
        return ResponseEntity.status(resultado.exitoso() ? 200 : 207).body(resultado);
    }

    private static Map<String, Object> aRespuesta(Feriado feriado) {
        return Map.of(
                "fecha", feriado.getFecha().toString(),
                "descripcion", feriado.getDescripcion(),
                "tipo", feriado.getTipo().name(),
                "cierraGimnasio", feriado.isCierraGimnasio(),
                "origen", feriado.getOrigen().name());
    }
}
