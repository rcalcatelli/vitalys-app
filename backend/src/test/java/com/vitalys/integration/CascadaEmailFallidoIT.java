package com.vitalys.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;

import com.vitalys.dto.NotificacionFallidaResponse;
import com.vitalys.service.notificaciones.EnvioEmailException;
import com.vitalys.service.notificaciones.NotificadorEmail;
import java.time.Duration;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.TestPropertySource;

/**
 * PI-59 reinterpretado. Un fallo del proveedor de email NO revierte la cascada: el envío ocurre
 * después del commit y en otro hilo, así que los turnos ya están cancelados y la disponibilidad ya
 * cambió cuando el proveedor falla. Lo que queda es la notificación marcada como fallida
 * (definitiva tras el único reintento) y visible para el ADMIN.
 */
@TestPropertySource(properties = "vitalys.email.reintento-delay=200ms")
class CascadaEmailFallidoIT extends CascadaITBase {

    @TestConfiguration
    static class ProveedorCaido {

        @Bean
        @Primary
        NotificadorEmail notificadorQueSiempreFalla() {
            return (destino, asunto, html) -> {
                throw new EnvioEmailException("Proveedor caído");
            };
        }
    }

    @Test
    void siElProveedorDeEmailFalla_laCascadaQuedaConfirmadaYLaNotificacionFallida() {
        ResponseEntity<Void> r = llamar(
                HttpMethod.DELETE, rutaDisponibilidad() + "/" + franjaLunesId + "?confirmar=true", null, tokenAdmin, Void.class);

        // La respuesta no depende del email: el cambio se confirmó
        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(cantidadDeFranjas()).isEqualTo(1);
        assertThat(estadoDe(turnoLunes10)).isEqualTo("CANCELADO_POR_PROFESIONAL");
        assertThat(estadoDe(turnoLunes12)).isEqualTo("CANCELADO_POR_PROFESIONAL");
        assertThat(avisosDeCancelacion()).isEqualTo(2);

        // Primer intento + un reintento a los 200 ms: definitiva, con el motivo registrado
        await().atMost(Duration.ofSeconds(15)).untilAsserted(() -> {
            List<Map<String, Object>> filas = jdbcTemplate.queryForList(
                    "SELECT exitoso, intentos, detalle_error FROM notificaciones WHERE tipo = 'AVISO_CANCELACION' "
                            + "AND turno_id IN (?, ?)",
                    turnoLunes10,
                    turnoLunes12);
            assertThat(filas).hasSize(2);
            assertThat(filas).allSatisfy(f -> {
                assertThat(f.get("exitoso")).isEqualTo(false);
                assertThat(f.get("intentos")).isEqualTo(2);
                assertThat((String) f.get("detalle_error")).contains("Proveedor caído");
            });
        });

        // Los turnos siguen cancelados y el ADMIN ve la alerta
        assertThat(estadoDe(turnoLunes11)).isEqualTo("CANCELADO_POR_PROFESIONAL");
        ResponseEntity<NotificacionFallidaResponse[]> alerta = llamar(
                HttpMethod.GET, "/api/admin/notificaciones?fallidas=true", null, tokenAdmin, NotificacionFallidaResponse[].class);
        assertThat(Arrays.asList(alerta.getBody()))
                .filteredOn(n -> n.pacienteEmail().equals(anaEmail))
                .singleElement()
                .satisfies(n -> assertThat(n.tipo()).isEqualTo("DEFINITIVA"));
    }
}
