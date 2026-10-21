package com.vitalys.integration;

import static org.assertj.core.api.Assertions.assertThat;

import com.vitalys.domain.RolUsuario;
import com.vitalys.domain.Usuario;
import com.vitalys.dto.FranjaResponse;
import com.vitalys.dto.LoginResponse;
import com.vitalys.repository.UsuarioRepository;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * T3-8 / T3-10: disponibilidad de profesionales contra Postgres real, con los tres profesionales
 * del seed (Valentina Méndez, Rodrigo Almirón, Florencia Rueda) y sus franjas de {@code seed.sql}.
 * Es el criterio de cierre de la issue #5: la carga de franjas, el rechazo de solapamientos (RN-11)
 * y los permisos. Las ITs no cargan el seed, así que cada test lo reproduce con emails propios.
 */
class DisponibilidadIT extends IntegrationTestBase {

    private static final String CLAVE = "Admin1234!";

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private String tokenAdmin;
    private Sembrado valentina;
    private Sembrado rodrigo;
    private Sembrado florencia;

    /** Un profesional sembrado: su id, su token y su email. */
    private record Sembrado(Long id, String token) {}

    @BeforeEach
    void sembrar() {
        String emailAdmin = "admin-" + UUID.randomUUID() + "@vitalys.test";
        usuarioRepository.save(new Usuario(emailAdmin, passwordEncoder.encode(CLAVE), RolUsuario.ADMIN));
        tokenAdmin = login(emailAdmin);

        // Mismas franjas que db/dml/seed.sql
        valentina = sembrarProfesional("Valentina", "Méndez", "NUTRICION", 30, new int[] {1, 3}, "09:00", "13:00");
        rodrigo = sembrarProfesional("Rodrigo", "Almirón", "PSICOLOGIA", 50, new int[] {2, 4}, "14:00", "19:00");
        florencia = sembrarProfesional("Florencia", "Rueda", "KINESIOLOGIA", 45, new int[] {1, 3, 5}, "08:00", "12:00");
    }

    private Sembrado sembrarProfesional(
            String nombre, String apellido, String especialidad, int duracion, int[] dias, String desde, String hasta) {
        String email = "prof-" + UUID.randomUUID() + "@vitalys.test";
        Usuario usuario = usuarioRepository.save(new Usuario(email, passwordEncoder.encode(CLAVE), RolUsuario.PROFESIONAL));
        Long id = jdbcTemplate.queryForObject(
                "INSERT INTO profesionales (usuario_id, nombre, apellido, especialidad, duracion_turno_minutos) "
                        + "VALUES (?, ?, ?, ?::especialidad, ?) RETURNING id",
                Long.class,
                usuario.getId(),
                nombre,
                apellido,
                especialidad,
                duracion);
        for (int dia : dias) {
            jdbcTemplate.update(
                    "INSERT INTO disponibilidad_profesional (profesional_id, dia_semana, hora_inicio, hora_fin) "
                            + "VALUES (?, ?, ?::time, ?::time)",
                    id,
                    dia,
                    desde,
                    hasta);
        }
        return new Sembrado(id, login(email));
    }

    private String login(String email) {
        Map<String, Object> body = Map.of("identificador", email, "contrasena", CLAVE);
        return restTemplate
                .postForEntity(urlBase() + "/api/auth/login", body, LoginResponse.class)
                .getBody()
                .getToken();
    }

    private <T> ResponseEntity<T> llamar(HttpMethod metodo, String ruta, Object body, String token, Class<T> tipo) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        return restTemplate.exchange(urlBase() + ruta, metodo, new HttpEntity<>(body, headers), tipo);
    }

    private static Map<String, Object> franja(int dia, String desde, String hasta) {
        return Map.of("diaSemana", dia, "horaInicio", desde, "horaFin", hasta);
    }

    private static String ruta(Sembrado p) {
        return "/api/profesionales/" + p.id() + "/disponibilidad";
    }

    private int cantidadDeFranjas(Sembrado p) {
        return jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM disponibilidad_profesional WHERE profesional_id = ?", Integer.class, p.id());
    }

    // --- carga y lectura ---

    @Test
    void franjasDelSeed_sePuedenLeerConCualquierToken() {
        ResponseEntity<FranjaResponse[]> r =
                llamar(HttpMethod.GET, ruta(florencia), null, valentina.token(), FranjaResponse[].class);

        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(r.getBody()).extracting(FranjaResponse::diaSemana).containsExactly(1, 3, 5);
    }

    @Test
    void profesionalInexistente_devuelve404() {
        assertThat(llamar(HttpMethod.GET, "/api/profesionales/999999/disponibilidad", null, tokenAdmin, String.class)
                        .getStatusCode())
                .isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void duenoAgregaFranja_yAdminAgregaLaDeOtro() {
        ResponseEntity<FranjaResponse> propia = llamar(
                HttpMethod.POST, ruta(valentina), franja(5, "09:00", "13:00"), valentina.token(), FranjaResponse.class);
        ResponseEntity<FranjaResponse> porAdmin =
                llamar(HttpMethod.POST, ruta(rodrigo), franja(5, "14:00", "19:00"), tokenAdmin, FranjaResponse.class);

        assertThat(propia.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(propia.getBody().diaSemana()).isEqualTo(5);
        assertThat(porAdmin.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(cantidadDeFranjas(valentina)).isEqualTo(3);
        assertThat(cantidadDeFranjas(rodrigo)).isEqualTo(3);
    }

    // --- RN-11: solapamiento ---

    @Test
    void solapamientoConLasFranjasDelSeed_devuelve409YNoModificaNada() {
        // Rodrigo atiende martes 14:00-19:00
        ResponseEntity<String> r =
                llamar(HttpMethod.POST, ruta(rodrigo), franja(2, "18:00", "20:00"), rodrigo.token(), String.class);

        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(r.getBody()).contains("se superpone");
        assertThat(cantidadDeFranjas(rodrigo)).isEqualTo(2);
    }

    @Test
    void solapamientoParcialYContenido_enValentinaYFlorencia_devuelve409() {
        // Valentina: lunes 09:00-13:00 (la nueva contiene a la existente)
        assertThat(llamar(HttpMethod.POST, ruta(valentina), franja(1, "08:00", "14:00"), tokenAdmin, String.class)
                        .getStatusCode())
                .isEqualTo(HttpStatus.CONFLICT);
        // Florencia: viernes 08:00-12:00 (la nueva queda adentro de la existente)
        assertThat(llamar(HttpMethod.POST, ruta(florencia), franja(5, "09:00", "10:00"), tokenAdmin, String.class)
                        .getStatusCode())
                .isEqualTo(HttpStatus.CONFLICT);
        assertThat(cantidadDeFranjas(valentina)).isEqualTo(2);
        assertThat(cantidadDeFranjas(florencia)).isEqualTo(3);
    }

    @Test
    void franjaContigua_seAcepta() {
        // Valentina: lunes 09:00-13:00; 13:00-15:00 empieza donde termina la anterior
        ResponseEntity<FranjaResponse> r = llamar(
                HttpMethod.POST, ruta(valentina), franja(1, "13:00", "15:00"), valentina.token(), FranjaResponse.class);

        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(cantidadDeFranjas(valentina)).isEqualTo(3);
    }

    @Test
    void mismoDiaEInicio_devuelve409() {
        assertThat(llamar(HttpMethod.POST, ruta(valentina), franja(1, "09:00", "10:00"), tokenAdmin, String.class)
                        .getStatusCode())
                .isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    void modificarFranja_haciendoqueSeSolape_devuelve409() {
        Long lunes = jdbcTemplate.queryForObject(
                "SELECT id FROM disponibilidad_profesional WHERE profesional_id = ? AND dia_semana = 1",
                Long.class,
                florencia.id());
        // Se mueve el lunes de Florencia al miércoles 08:00-12:00, donde ya hay una franja
        ResponseEntity<String> r = llamar(
                HttpMethod.PUT, ruta(florencia) + "/" + lunes, franja(3, "09:00", "11:00"), tokenAdmin, String.class);

        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    void modificarFranja_sinSolaparse_laActualiza() {
        Long lunes = jdbcTemplate.queryForObject(
                "SELECT id FROM disponibilidad_profesional WHERE profesional_id = ? AND dia_semana = 1",
                Long.class,
                florencia.id());

        ResponseEntity<FranjaResponse> r = llamar(
                HttpMethod.PUT, ruta(florencia) + "/" + lunes, franja(1, "08:00", "10:00"), florencia.token(), FranjaResponse.class);

        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(r.getBody().horaFin().toString()).isEqualTo("10:00");
    }

    @Test
    void horasInvertidas_devuelve400() {
        assertThat(llamar(HttpMethod.POST, ruta(valentina), franja(5, "13:00", "09:00"), tokenAdmin, String.class)
                        .getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);
    }

    // --- eliminar ---

    @Test
    void eliminarFranja_esBorradoFisico() {
        Long lunes = jdbcTemplate.queryForObject(
                "SELECT id FROM disponibilidad_profesional WHERE profesional_id = ? AND dia_semana = 1",
                Long.class,
                valentina.id());

        ResponseEntity<Void> r = llamar(HttpMethod.DELETE, ruta(valentina) + "/" + lunes, null, valentina.token(), Void.class);

        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(cantidadDeFranjas(valentina)).isEqualTo(1);
        assertThat(llamar(HttpMethod.DELETE, ruta(valentina) + "/" + lunes, null, valentina.token(), String.class)
                        .getStatusCode())
                .isEqualTo(HttpStatus.NOT_FOUND);
    }

    // --- batch ---

    @Test
    void batch_reemplazaReutilizandoDiaEInicio_sinChoqueEspurio() {
        // Mismo lunes 09:00 que ya existe: exige que el borrado se vuelque antes del insert
        Map<String, Object> body =
                Map.of("franjas", List.of(franja(1, "09:00", "11:00"), franja(1, "11:00", "13:00"), franja(4, "10:00", "12:00")));

        ResponseEntity<FranjaResponse[]> r =
                llamar(HttpMethod.PUT, ruta(valentina), body, valentina.token(), FranjaResponse[].class);

        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(r.getBody()).hasSize(3);
        assertThat(cantidadDeFranjas(valentina)).isEqualTo(3);
    }

    @Test
    void batch_conSolapamientoInterno_devuelve409YNoDejaCambiosParciales() {
        Map<String, Object> body = Map.of("franjas", List.of(franja(2, "14:00", "19:00"), franja(2, "18:00", "20:00")));

        ResponseEntity<String> r = llamar(HttpMethod.PUT, ruta(rodrigo), body, tokenAdmin, String.class);

        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        // Se conserva la disponibilidad original del seed: martes y jueves 14:00-19:00
        assertThat(jdbcTemplate.queryForList(
                        "SELECT dia_semana FROM disponibilidad_profesional WHERE profesional_id = ? ORDER BY dia_semana",
                        Integer.class,
                        rodrigo.id()))
                .containsExactly(2, 4);
    }

    @Test
    void batch_vacio_dejaAlProfesionalSinDisponibilidad() {
        ResponseEntity<FranjaResponse[]> r =
                llamar(HttpMethod.PUT, ruta(florencia), Map.of("franjas", List.of()), tokenAdmin, FranjaResponse[].class);

        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(cantidadDeFranjas(florencia)).isZero();
    }

    @Test
    void batch_sinCampoFranjas_devuelve400() {
        assertThat(llamar(HttpMethod.PUT, ruta(florencia), Map.of(), tokenAdmin, String.class).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);
    }

    // --- permisos ---

    @Test
    void profesionalAjeno_recibe403EnTodasLasEscrituras() {
        Long franjaDeRodrigo = jdbcTemplate.queryForObject(
                "SELECT id FROM disponibilidad_profesional WHERE profesional_id = ? AND dia_semana = 2",
                Long.class,
                rodrigo.id());

        assertThat(llamar(HttpMethod.POST, ruta(rodrigo), franja(5, "14:00", "15:00"), valentina.token(), String.class)
                        .getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(llamar(
                                HttpMethod.PUT,
                                ruta(rodrigo) + "/" + franjaDeRodrigo,
                                franja(2, "14:00", "15:00"),
                                valentina.token(),
                                String.class)
                        .getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(llamar(HttpMethod.DELETE, ruta(rodrigo) + "/" + franjaDeRodrigo, null, valentina.token(), String.class)
                        .getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(llamar(HttpMethod.PUT, ruta(rodrigo), Map.of("franjas", List.of()), valentina.token(), String.class)
                        .getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(cantidadDeFranjas(rodrigo)).isEqualTo(2);
    }

    @Test
    void socioPaciente_puedeLeerPeroNoEscribir() {
        String email = "socio-" + UUID.randomUUID() + "@mail.test";
        usuarioRepository.save(new Usuario(email, passwordEncoder.encode(CLAVE), RolUsuario.SOCIO_PACIENTE));
        String token = login(email);

        assertThat(llamar(HttpMethod.GET, ruta(valentina), null, token, String.class).getStatusCode())
                .isEqualTo(HttpStatus.OK);
        assertThat(llamar(HttpMethod.POST, ruta(valentina), franja(5, "09:00", "10:00"), token, String.class)
                        .getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void sinToken_devuelve401() {
        assertThat(restTemplate.getForEntity(urlBase() + ruta(valentina), String.class).getStatusCode())
                .isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void profesionalDeBaja_nosePuedeModificarSuDisponibilidad() {
        jdbcTemplate.update("UPDATE profesionales SET activo = FALSE WHERE id = ?", florencia.id());

        assertThat(llamar(HttpMethod.POST, ruta(florencia), franja(2, "08:00", "09:00"), tokenAdmin, String.class)
                        .getStatusCode())
                .isEqualTo(HttpStatus.CONFLICT);
    }
}
