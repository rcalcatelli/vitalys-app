package com.vitalys.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.vitalys.domain.Feriado;
import com.vitalys.domain.TipoFeriado;
import com.vitalys.repository.FeriadoRepository;
import com.vitalys.service.feriados.ResultadoSincronizacion;
import com.vitalys.service.feriados.SincronizadorFeriados;
import java.time.LocalDate;
import java.time.Year;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;

/** Lógica propia del controller de feriados: el año por defecto, el mapeo y el 200/207. */
class FeriadoControllerTest {

    private final FeriadoRepository repositorio = mock(FeriadoRepository.class);
    private final SincronizadorFeriados sincronizador = mock(SincronizadorFeriados.class);
    private final FeriadoController controller = new FeriadoController(repositorio, sincronizador);

    @Test
    void listar_conAnio_consultaEseAnioCompletoYMapeaCadaCampo() {
        Feriado f = Feriado.manual(LocalDate.of(2030, 5, 25), "Revolución de Mayo", TipoFeriado.INAMOVIBLE, true);
        when(repositorio.findEntreFechas(LocalDate.of(2030, 1, 1), LocalDate.of(2030, 12, 31)))
                .thenReturn(List.of(f));

        List<Map<String, Object>> r = controller.listar(2030);

        assertThat(r).hasSize(1);
        assertThat(r.get(0))
                .containsEntry("fecha", "2030-05-25")
                .containsEntry("descripcion", "Revolución de Mayo")
                .containsEntry("tipo", "INAMOVIBLE")
                .containsEntry("cierraGimnasio", true)
                .containsEntry("origen", "MANUAL");
    }

    @Test
    void listar_sinAnio_usaElAnioEnCurso() {
        int actual = Year.now().getValue();
        when(repositorio.findEntreFechas(any(), any())).thenReturn(List.of());

        List<Map<String, Object>> r = controller.listar(null);

        assertThat(r).isEmpty();
        verify(repositorio).findEntreFechas(LocalDate.of(actual, 1, 1), LocalDate.of(actual, 12, 31));
    }

    @Test
    void sincronizar_sinErrores_responde200() {
        ResultadoSincronizacion ok = new ResultadoSincronizacion(List.of(2026), 1, 0, 0, 5, List.of());
        when(sincronizador.sincronizar()).thenReturn(ok);

        ResponseEntity<ResultadoSincronizacion> r = controller.sincronizar();

        assertThat(r.getStatusCode().value()).isEqualTo(200);
        assertThat(r.getBody()).isSameAs(ok);
    }

    @Test
    void sincronizar_conAlgunAnioFallido_responde207() {
        ResultadoSincronizacion parcial =
                new ResultadoSincronizacion(List.of(2026, 2027), 0, 0, 0, 5, List.of("2027: sin respuesta"));
        when(sincronizador.sincronizar()).thenReturn(parcial);

        ResponseEntity<ResultadoSincronizacion> r = controller.sincronizar();

        assertThat(r.getStatusCode().value()).isEqualTo(207);
        assertThat(r.getBody().errores()).containsExactly("2027: sin respuesta");
    }
}
