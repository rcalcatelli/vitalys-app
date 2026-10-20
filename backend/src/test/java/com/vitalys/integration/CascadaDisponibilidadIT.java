package com.vitalys.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.awaitility.Awaitility.await;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

/**
 * RN-24 / RN-25 contra Postgres real (PI-53 a PI-60). Los turnos futuros se insertan por JDBC con
 * fechas relativas al reloj real. El proveedor de email es el log: nada sale a la red (el fallo de
 * envío se prueba en {@link CascadaEmailFallidoIT}).
 */
@SuppressWarnings("unchecked")
class CascadaDisponibilidadIT extends CascadaITBase {

    private static Map<String, Object> impactoDe(ResponseEntity<Map> r) {
        return (Map<String, Object>) r.getBody().get("impacto");
    }

    private String rutaFranja(Long franjaId) {
        return rutaDisponibilidad() + "/" + franjaId;
    }

    // --- PI-53: el impacto es solo una vista previa ---

    @Test
    void impactoDeQuitarUnaFranja_listaLosTurnosYNoModificaNada() {
        ResponseEntity<Map> r = llamar(
                HttpMethod.GET, rutaFranja(franjaLunesId) + "/impacto", null, tokenProfesional, Map.class);

        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(r.getBody().get("cantidad")).isEqualTo(3);
        List<Map<String, Object>> turnos = (List<Map<String, Object>>) r.getBody().get("turnos");
        assertThat(turnos)
                .extracting(t -> t.get("turnoId"))
                .containsExactly(turnoLunes10.intValue(), turnoLunes11.intValue(), turnoLunes12.intValue());
        assertThat(turnos.get(0).get("paciente")).isEqualTo("Ana Gómez");
        assertThat(turnos.get(0)).containsKeys("inicio", "fin", "personaId");
        assertThat(estadoDe(turnoLunes10)).isEqualTo("RESERVADO");
        assertThat(cantidadDeFranjas()).isEqualTo(2);
    }

    @Test
    void impactoDeUnBorrador_ampliar_noTieneImpacto_yReducir_si() {
        ResponseEntity<Map> ampliar = llamar(
                HttpMethod.POST,
                rutaDisponibilidad() + "/impacto",
                Map.of("franjas", List.of(franjaBody(1, "08:00", "14:00"), franjaBody(3, "09:00", "13:00"))),
                tokenAdmin,
                Map.class);
        ResponseEntity<Map> reducir = llamar(
                HttpMethod.POST,
                rutaDisponibilidad() + "/impacto",
                Map.of("franjas", List.of(franjaBody(3, "09:00", "13:00"))),
                tokenAdmin,
                Map.class);

        assertThat(ampliar.getBody().get("cantidad")).isEqualTo(0);
        assertThat(reducir.getBody().get("cantidad")).isEqualTo(3);
        assertThat(cantidadDeFranjas()).isEqualTo(2);
        assertThat(estadoDe(turnoLunes10)).isEqualTo("RESERVADO");
    }

    // --- PI-54: sin confirmar no se aplica ---

    @Test
    void quitarUnaFranjaSinConfirmar_devuelve409ConElImpactoYNoCambiaNada() {
        ResponseEntity<Map> r = llamar(HttpMethod.DELETE, rutaFranja(franjaLunesId), null, tokenProfesional, Map.class);

        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(impactoDe(r).get("cantidad")).isEqualTo(3);
        assertThat((List<?>) impactoDe(r).get("turnos")).hasSize(3);
        assertThat(cantidadDeFranjas()).isEqualTo(2);
        assertThat(estadoDe(turnoLunes10)).isEqualTo("RESERVADO");
        assertThat(avisosDeCancelacion()).isZero();
    }

    @Test
    void reemplazoTotalSinConfirmar_devuelve409ConElImpactoYNoCambiaNada() {
        ResponseEntity<Map> r = llamar(
                HttpMethod.PUT,
                rutaDisponibilidad(),
                Map.of("franjas", List.of(franjaBody(1, "09:00", "11:00"), franjaBody(3, "09:00", "13:00"))),
                tokenAdmin,
                Map.class);

        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        // 11:00 y 12:00 quedan afuera de la franja 09:00-11:00; el de las 10:00 sigue cubierto
        assertThat(impactoDe(r).get("cantidad")).isEqualTo(2);
        assertThat(estadoDe(turnoLunes10)).isEqualTo("RESERVADO");
        assertThat(jdbcTemplate.queryForObject(
                        "SELECT hora_fin::text FROM disponibilidad_profesional WHERE id = ?", String.class, franjaLunesId))
                .startsWith("13:00");
    }

    // --- PI-55, PI-56, PI-58: confirmada ---

    @Test
    void quitarUnaFranjaConfirmando_cancelaSoloLosFuturosDeEsaFranjaYAvisaUnaVezPorPaciente() {
        ResponseEntity<Void> r = llamar(
                HttpMethod.DELETE, rutaFranja(franjaLunesId) + "?confirmar=true", null, tokenProfesional, Void.class);

        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(cantidadDeFranjas()).isEqualTo(1);
        for (Long id : List.of(turnoLunes10, turnoLunes11, turnoLunes12)) {
            Map<String, Object> t = jdbcTemplate.queryForMap(
                    "SELECT estado::text AS estado, cancelado_en, cancelado_por_usuario, motivo_cancelacion "
                            + "FROM turnos WHERE id = ?",
                    id);
            assertThat(t.get("estado")).isEqualTo("CANCELADO_POR_PROFESIONAL");
            assertThat(t.get("cancelado_en")).isNotNull();
            assertThat(t.get("cancelado_por_usuario")).isEqualTo(profesionalUsuarioId);
            assertThat((String) t.get("motivo_cancelacion")).isNotBlank();
        }
        // PI-56: lo ya transcurrido y lo que sigue cubierto no se toca
        assertThat(estadoDe(turnoPasado)).isEqualTo("RESERVADO");
        assertThat(estadoDe(turnoMiercoles10)).isEqualTo("RESERVADO");

        // PI-58: Ana perdió dos turnos y Beto uno: dos avisos, cada uno anclado a su turno más cercano
        List<Map<String, Object>> avisos = jdbcTemplate.queryForList(
                "SELECT persona_id, turno_id, email_destino FROM notificaciones WHERE tipo = 'AVISO_CANCELACION' "
                        + "AND turno_id IN (?, ?, ?) ORDER BY persona_id",
                turnoLunes10,
                turnoLunes11,
                turnoLunes12);
        assertThat(avisos).hasSize(2);
        assertThat(avisos).extracting(a -> a.get("persona_id")).containsExactly(anaPersonaId, betoPersonaId);
        assertThat(avisos.get(0).get("turno_id")).isEqualTo(turnoLunes10);
        assertThat(avisos.get(0).get("email_destino")).isEqualTo(anaEmail);
        assertThat(avisos.get(1).get("turno_id")).isEqualTo(turnoLunes12);

        // El despacho es posterior al commit y asincrónico: con el proveedor log termina exitoso
        await().atMost(Duration.ofSeconds(10)).untilAsserted(() -> assertThat(jdbcTemplate.queryForObject(
                        "SELECT COUNT(*) FROM notificaciones WHERE tipo = 'AVISO_CANCELACION' AND exitoso "
                                + "AND turno_id IN (?, ?)",
                        Integer.class,
                        turnoLunes10,
                        turnoLunes12))
                .isEqualTo(2));
    }

    @Test
    void reemplazoTotalConfirmando_cancelaSoloLosQueQuedanAfuera() {
        ResponseEntity<Object> r = llamar(
                HttpMethod.PUT,
                rutaDisponibilidad() + "?confirmar=true",
                Map.of("franjas", List.of(franjaBody(1, "09:00", "11:00"), franjaBody(3, "09:00", "13:00"))),
                tokenAdmin,
                Object.class);

        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(estadoDe(turnoLunes10)).isEqualTo("RESERVADO");
        assertThat(estadoDe(turnoLunes11)).isEqualTo("CANCELADO_POR_PROFESIONAL");
        assertThat(estadoDe(turnoLunes12)).isEqualTo("CANCELADO_POR_PROFESIONAL");
        assertThat(jdbcTemplate.queryForObject(
                        "SELECT cancelado_por_usuario FROM turnos WHERE id = ?", Long.class, turnoLunes11))
                .isEqualTo(adminUsuarioId);
    }

    @Test
    void recortarUnaFranjaPorFila_exigeConfirmarYLuegoCancela() {
        Map<String, Object> recorte = franjaBody(1, "09:00", "11:00");

        ResponseEntity<Map> sinConfirmar =
                llamar(HttpMethod.PUT, rutaFranja(franjaLunesId), recorte, tokenProfesional, Map.class);
        assertThat(sinConfirmar.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(impactoDe(sinConfirmar).get("cantidad")).isEqualTo(2);
        assertThat(estadoDe(turnoLunes11)).isEqualTo("RESERVADO");

        ResponseEntity<Object> confirmado = llamar(
                HttpMethod.PUT, rutaFranja(franjaLunesId) + "?confirmar=true", recorte, tokenProfesional, Object.class);
        assertThat(confirmado.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(estadoDe(turnoLunes10)).isEqualTo("RESERVADO");
        assertThat(estadoDe(turnoLunes11)).isEqualTo("CANCELADO_POR_PROFESIONAL");
        assertThat(estadoDe(turnoLunes12)).isEqualTo("CANCELADO_POR_PROFESIONAL");
    }

    // --- PI-60: ampliar nunca pide confirmación ---

    @Test
    void ampliarLaDisponibilidad_seAplicaSinConfirmarYNoCancelaNada() {
        ResponseEntity<Object> batch = llamar(
                HttpMethod.PUT,
                rutaDisponibilidad(),
                Map.of("franjas", List.of(franjaBody(1, "08:00", "14:00"), franjaBody(3, "09:00", "13:00"))),
                tokenProfesional,
                Object.class);
        ResponseEntity<Object> nueva = llamar(
                HttpMethod.POST, rutaDisponibilidad(), franjaBody(5, "09:00", "13:00"), tokenProfesional, Object.class);

        assertThat(batch.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(nueva.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(estadoDe(turnoLunes10)).isEqualTo("RESERVADO");
        assertThat(avisosDeCancelacion()).isZero();
    }

    @Test
    void reducirSinTurnosAfectados_seAplicaSinConfirmar() {
        // Los turnos del lunes están entre las 10:00 y las 12:30: recortar 09:00-10:00 no los toca
        ResponseEntity<Object> r = llamar(
                HttpMethod.PUT, rutaFranja(franjaLunesId), franjaBody(1, "10:00", "13:00"), tokenProfesional, Object.class);

        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(estadoDe(turnoLunes10)).isEqualTo("RESERVADO");
    }

    // --- PI-57: el lugar liberado se puede volver a reservar ---

    @Test
    void elHorarioLiberadoPorLaCascada_sePuedeReservarDeNuevo() {
        assertThatThrownBy(() -> turno(betoPersonaId, betoUsuarioId, lunes, "10:00"))
                .isInstanceOf(DataAccessException.class);

        llamar(HttpMethod.DELETE, rutaFranja(franjaLunesId) + "?confirmar=true", null, tokenAdmin, Void.class);

        // fn_turno_ocupa_lugar: cancelado_en < inicio libera el lugar sin tocar ninguna restricción
        Long nuevo = turno(betoPersonaId, betoUsuarioId, lunes, "10:00");
        assertThat(estadoDe(nuevo)).isEqualTo("RESERVADO");
    }

    // --- atomicidad ---

    @Test
    void siElCambioDeDisponibilidadFalla_laCascadaSeRevierteCompleta() {
        // Franjas solapadas entre sí: el trigger las rechaza DESPUÉS de cancelar el turno de las 12:00
        ResponseEntity<Object> r = llamar(
                HttpMethod.PUT,
                rutaDisponibilidad() + "?confirmar=true",
                Map.of("franjas", List.of(franjaBody(1, "09:00", "11:00"), franjaBody(1, "10:00", "12:00"))),
                tokenAdmin,
                Object.class);

        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(estadoDe(turnoLunes12)).isEqualTo("RESERVADO");
        assertThat(cantidadDeFranjas()).isEqualTo(2);
        assertThat(avisosDeCancelacion()).isZero();
    }

    // --- RN-25: baja en dos pasos ---

    @Test
    void bajaEnDosPasos_primeroElImpacto_despuesLaConfirmacion() {
        String ruta = "/api/profesionales/" + profesionalId;

        ResponseEntity<Map> impacto = llamar(HttpMethod.GET, ruta + "/baja/impacto", null, tokenAdmin, Map.class);
        assertThat(impacto.getStatusCode()).isEqualTo(HttpStatus.OK);
        // Cuatro turnos futuros: los tres del lunes y el del miércoles (sin disponibilidad ninguno queda cubierto)
        assertThat(impacto.getBody().get("cantidad")).isEqualTo(4);

        ResponseEntity<Map> sinConfirmar = llamar(HttpMethod.DELETE, ruta, null, tokenAdmin, Map.class);
        assertThat(sinConfirmar.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(impactoDe(sinConfirmar).get("cantidad")).isEqualTo(4);
        assertThat(jdbcTemplate.queryForObject("SELECT activo FROM profesionales WHERE id = ?", Boolean.class, profesionalId))
                .isTrue();
        assertThat(estadoDe(turnoLunes10)).isEqualTo("RESERVADO");

        ResponseEntity<Map> confirmada = llamar(HttpMethod.DELETE, ruta + "?confirmar=true", null, tokenAdmin, Map.class);
        assertThat(confirmada.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(confirmada.getBody().get("activo")).isEqualTo(false);
        assertThat(jdbcTemplate.queryForObject("SELECT activo FROM profesionales WHERE id = ?", Boolean.class, profesionalId))
                .isFalse();
        assertThat(jdbcTemplate.queryForObject("SELECT activo FROM usuarios WHERE id = ?", Boolean.class, profesionalUsuarioId))
                .isFalse();
        assertThat(cantidadDeFranjas()).isZero();
        for (Long id : List.of(turnoLunes10, turnoLunes11, turnoLunes12, turnoMiercoles10)) {
            assertThat(estadoDe(id)).isEqualTo("CANCELADO_POR_PROFESIONAL");
        }
        assertThat(estadoDe(turnoPasado)).isEqualTo("RESERVADO");
        assertThat(avisosDeCancelacion()).isEqualTo(2);
        // El token del profesional dado de baja deja de servir
        assertThat(llamar(HttpMethod.GET, "/api/profesionales/me", null, tokenProfesional, String.class).getStatusCode())
                .isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void bajaSinTurnosFuturos_noPideConfirmacion() {
        jdbcTemplate.update("DELETE FROM turnos WHERE profesional_id = ?", profesionalId);

        ResponseEntity<Map> r =
                llamar(HttpMethod.DELETE, "/api/profesionales/" + profesionalId, null, tokenAdmin, Map.class);

        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(r.getBody().get("activo")).isEqualTo(false);
    }

    // --- permisos ---

    @Test
    void matrizDeRoles_enLasOperacionesDeImpactoYConfirmacion() {
        String impactoFranja = rutaFranja(franjaLunesId) + "/impacto";
        String impactoBorrador = rutaDisponibilidad() + "/impacto";
        Object borrador = Map.of("franjas", List.of());
        String baja = "/api/profesionales/" + profesionalId;

        // otro profesional y un socio: 403 en todo
        for (String token : List.of(tokenOtroProfesional, tokenSocio)) {
            assertThat(llamar(HttpMethod.GET, impactoFranja, null, token, String.class).getStatusCode())
                    .isEqualTo(HttpStatus.FORBIDDEN);
            assertThat(llamar(HttpMethod.POST, impactoBorrador, borrador, token, String.class).getStatusCode())
                    .isEqualTo(HttpStatus.FORBIDDEN);
            assertThat(llamar(HttpMethod.DELETE, rutaFranja(franjaLunesId) + "?confirmar=true", null, token, String.class)
                            .getStatusCode())
                    .isEqualTo(HttpStatus.FORBIDDEN);
            assertThat(llamar(HttpMethod.PUT, rutaDisponibilidad() + "?confirmar=true", borrador, token, String.class)
                            .getStatusCode())
                    .isEqualTo(HttpStatus.FORBIDDEN);
        }
        // la baja y su impacto son solo del ADMIN, incluso para el propio profesional
        assertThat(llamar(HttpMethod.GET, baja + "/baja/impacto", null, tokenProfesional, String.class).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(llamar(HttpMethod.DELETE, baja + "?confirmar=true", null, tokenProfesional, String.class).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
        // sin token
        assertThat(llamar(HttpMethod.GET, impactoFranja, null, null, String.class).getStatusCode())
                .isEqualTo(HttpStatus.UNAUTHORIZED);
        // y nada de lo anterior modificó nada
        assertThat(estadoDe(turnoLunes10)).isEqualTo("RESERVADO");
        assertThat(cantidadDeFranjas()).isEqualTo(2);
    }

    @Test
    void impactoDeFranjaOProfesionalInexistente_devuelve404() {
        assertThat(llamar(HttpMethod.GET, rutaFranja(999999L) + "/impacto", null, tokenAdmin, String.class).getStatusCode())
                .isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(llamar(HttpMethod.GET, "/api/profesionales/999999/baja/impacto", null, tokenAdmin, String.class)
                        .getStatusCode())
                .isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(llamar(HttpMethod.DELETE, "/api/profesionales/999999?confirmar=true", null, tokenAdmin, String.class)
                        .getStatusCode())
                .isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void turnoQueEmpezoYaNoEsFuturo_noEntraEnElImpacto() {
        // Un turno de hace una hora (hora argentina) dentro de la franja: transcurrido, nunca se toca
        OffsetDateTime haceUnaHora = OffsetDateTime.now(AR).minusHours(1);
        jdbcTemplate.update(
                "INSERT INTO turnos (persona_id, profesional_id, tipo_turno, reservado_por_usuario_id, inicio, fin) "
                        + "VALUES (?, ?, 'CONSULTORIO', ?, ?, ?)",
                anaPersonaId,
                profesionalId,
                anaUsuarioId,
                haceUnaHora,
                haceUnaHora.plusMinutes(30));

        ResponseEntity<Map> r = llamar(HttpMethod.POST, rutaDisponibilidad() + "/impacto", Map.of("franjas", List.of()), tokenAdmin, Map.class);

        assertThat(r.getBody().get("cantidad")).isEqualTo(4);
    }
}
