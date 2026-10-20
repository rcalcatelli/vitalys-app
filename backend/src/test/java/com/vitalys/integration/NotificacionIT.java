package com.vitalys.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;

import com.vitalys.domain.RolUsuario;
import com.vitalys.domain.Usuario;
import com.vitalys.dto.LoginResponse;
import com.vitalys.dto.NotificacionFallidaResponse;
import com.vitalys.repository.UsuarioRepository;
import com.vitalys.service.notificaciones.DespachadorNotificaciones;
import com.vitalys.service.notificaciones.NotificacionPorEnviar;
import java.time.Duration;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Notificaciones contra Postgres real: el listado de fallidas del ADMIN (definitivas y huérfanas)
 * y el despacho AFTER_COMMIT. El proveedor de email es el log (application.properties de test):
 * nada sale a la red.
 */
class NotificacionIT extends IntegrationTestBase {

    private static final String CLAVE = "Admin1234!";

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private DespachadorNotificaciones despachador;

    @Autowired
    private ApplicationEventPublisher publisher;

    @Autowired
    private TransactionTemplate transactionTemplate;

    private String tokenAdmin;
    private String tokenSocio;
    private Long personaId;
    private Long turnoId;
    private Long profesionalId;

    @BeforeEach
    void sembrar() {
        String emailAdmin = "admin-" + UUID.randomUUID() + "@vitalys.test";
        usuarioRepository.save(new Usuario(emailAdmin, passwordEncoder.encode(CLAVE), RolUsuario.ADMIN));
        tokenAdmin = login(emailAdmin);

        String emailSocio = "socio-" + UUID.randomUUID() + "@vitalys.test";
        Usuario socio = usuarioRepository.save(
                new Usuario(emailSocio, passwordEncoder.encode(CLAVE), RolUsuario.SOCIO_PACIENTE));
        tokenSocio = login(emailSocio);
        personaId = jdbcTemplate.queryForObject(
                "INSERT INTO personas (usuario_id, nombre, apellido, dni) VALUES (?, 'Ana', 'Gómez', ?) RETURNING id",
                Long.class,
                socio.getId(),
                UUID.randomUUID().toString().substring(0, 18));

        String emailProf = "prof-" + UUID.randomUUID() + "@vitalys.test";
        Usuario usuarioProf = usuarioRepository.save(
                new Usuario(emailProf, passwordEncoder.encode(CLAVE), RolUsuario.PROFESIONAL));
        profesionalId = jdbcTemplate.queryForObject(
                "INSERT INTO profesionales (usuario_id, nombre, apellido, especialidad, duracion_turno_minutos) "
                        + "VALUES (?, 'Valentina', 'Méndez', 'NUTRICION'::especialidad, 30) RETURNING id",
                Long.class,
                usuarioProf.getId());
        turnoId = jdbcTemplate.queryForObject(
                "INSERT INTO turnos (persona_id, profesional_id, tipo_turno, reservado_por_usuario_id, inicio, fin) "
                        + "VALUES (?, ?, 'CONSULTORIO', ?, NOW() + INTERVAL '30 days', NOW() + INTERVAL '30 days 30 minutes') "
                        + "RETURNING id",
                Long.class,
                personaId,
                profesionalId,
                socio.getId());
    }

    private String login(String email) {
        Map<String, Object> body = Map.of("identificador", email, "contrasena", CLAVE);
        return restTemplate
                .postForEntity(urlBase() + "/api/auth/login", body, LoginResponse.class)
                .getBody()
                .getToken();
    }

    private <T> ResponseEntity<T> get(String ruta, String token, Class<T> tipo) {
        HttpHeaders headers = new HttpHeaders();
        if (token != null) {
            headers.setBearerAuth(token);
        }
        return restTemplate.exchange(urlBase() + ruta, HttpMethod.GET, new HttpEntity<>(headers), tipo);
    }

    /** Inserta una notificación del turno sembrado, con los minutos de antigüedad indicados. */
    private Long notificacion(boolean exitoso, int intentos, Integer minutosDesdeUltimoIntento, int minutosDesdeEnvio) {
        return jdbcTemplate.queryForObject(
                "INSERT INTO notificaciones (persona_id, turno_id, tipo, enviado_en, email_destino, exitoso, "
                        + "detalle_error, intentos, ultimo_intento_en) "
                        + "VALUES (?, ?, 'AVISO_CANCELACION', NOW() - make_interval(mins => ?), 'ana@vitalys.test', ?, "
                        + "?, ?, CASE WHEN ?::int IS NULL THEN NULL ELSE NOW() - make_interval(mins => ?::int) END) "
                        + "RETURNING id",
                Long.class,
                personaId,
                turnoId,
                minutosDesdeEnvio,
                exitoso,
                exitoso ? null : "Brevo respondió 503",
                intentos,
                minutosDesdeUltimoIntento,
                minutosDesdeUltimoIntento);
    }

    private List<NotificacionFallidaResponse> fallidas() {
        ResponseEntity<NotificacionFallidaResponse[]> r =
                get("/api/admin/notificaciones?fallidas=true", tokenAdmin, NotificacionFallidaResponse[].class);
        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.OK);
        return Arrays.asList(r.getBody());
    }

    // --- listado ---

    @Test
    void sinToken_devuelve401_ySocio_devuelve403() {
        assertThat(get("/api/admin/notificaciones?fallidas=true", null, String.class).getStatusCode())
                .isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(get("/api/admin/notificaciones?fallidas=true", tokenSocio, String.class).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void lista_definitivasYHuerfanas_peroNoExitosasNiEnCursoRecientes() {
        Long definitiva = notificacion(false, 2, 1, 2);
        Long huerfanaConIntento = notificacion(false, 1, 30, 31);
        Long huerfanaSinIntento = notificacion(false, 0, null, 60);
        Long enCursoReciente = notificacion(false, 1, 1, 1);
        Long exitosa = notificacion(true, 1, 60, 61);

        List<NotificacionFallidaResponse> r = fallidas();

        assertThat(r).extracting(NotificacionFallidaResponse::id)
                .contains(definitiva, huerfanaConIntento, huerfanaSinIntento)
                .doesNotContain(enCursoReciente, exitosa);
        assertThat(porId(r, definitiva).tipo()).isEqualTo("DEFINITIVA");
        assertThat(porId(r, huerfanaConIntento).tipo()).isEqualTo("HUERFANA");
        assertThat(porId(r, huerfanaSinIntento).tipo()).isEqualTo("HUERFANA");
    }

    @Test
    void cadaFila_traeLosDatosQueNecesitaLaPantalla() {
        Long id = notificacion(false, 2, 1, 2);

        NotificacionFallidaResponse n = porId(fallidas(), id);

        assertThat(n.pacienteNombre()).isEqualTo("Ana Gómez");
        assertThat(n.pacienteEmail()).isEqualTo("ana@vitalys.test");
        assertThat(n.profesionalNombre()).isEqualTo("Valentina Méndez");
        assertThat(n.turnoId()).isEqualTo(turnoId);
        assertThat(n.fecha()).isNotNull();
        assertThat(n.hora()).isNotNull();
        assertThat(n.detalleError()).isEqualTo("Brevo respondió 503");
        assertThat(n.intentos()).isEqualTo(2);
        assertThat(n.ultimoIntentoEn()).isNotNull();
    }

    // --- despacho ---

    @Test
    void despacharDirecto_marcaLaFilaComoExitosa() {
        Long id = notificacion(false, 0, null, 0);

        despachador.despachar(new NotificacionPorEnviar(id, "Turno cancelado", "<p>Hola</p>"));

        assertThat(estado(id)).containsEntry("exitoso", true).containsEntry("intentos", 1);
        assertThat(estado(id).get("ultimo_intento_en")).isNotNull();
    }

    @Test
    void eventoPublicadoEnUnaTransaccion_seDespachaDespuesDelCommit() {
        Long[] id = new Long[1];

        transactionTemplate.executeWithoutResult(tx -> {
            id[0] = notificacion(false, 0, null, 0);
            publisher.publishEvent(new NotificacionPorEnviar(id[0], "Turno cancelado", "<p>Hola</p>"));
        });

        await().atMost(Duration.ofSeconds(10)).untilAsserted(() ->
                assertThat(estado(id[0])).containsEntry("exitoso", true).containsEntry("intentos", 1));
    }

    @Test
    void eventoDeUnaTransaccionRevertida_noEnviaNada() throws Exception {
        Long[] id = new Long[1];

        transactionTemplate.executeWithoutResult(tx -> {
            id[0] = notificacion(false, 0, null, 0);
            publisher.publishEvent(new NotificacionPorEnviar(id[0], "Turno cancelado", "<p>Hola</p>"));
            tx.setRollbackOnly();
        });

        Thread.sleep(500);
        assertThat(jdbcTemplate.queryForList("SELECT id FROM notificaciones WHERE id = ?", id[0])).isEmpty();
    }

    private Map<String, Object> estado(Long id) {
        return jdbcTemplate.queryForMap(
                "SELECT exitoso, intentos, ultimo_intento_en FROM notificaciones WHERE id = ?", id);
    }

    private static NotificacionFallidaResponse porId(List<NotificacionFallidaResponse> lista, Long id) {
        return lista.stream().filter(n -> n.id().equals(id)).findFirst().orElseThrow();
    }
}
