package com.vitalys.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.vitalys.domain.RolUsuario;
import com.vitalys.domain.Usuario;
import com.vitalys.dto.LoginResponse;
import com.vitalys.dto.PersonaResponse;
import com.vitalys.repository.UsuarioRepository;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * T3-10: ABM de personas contra Postgres real. Cubre la baja lógica (la fila nunca se borra), la
 * reactivación y que la unicidad del DNI la garantiza la base y no solo el servicio.
 */
@SuppressWarnings("unchecked")
class PersonaIT extends IntegrationTestBase {

    private static final String CLAVE = "Admin1234!";

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private String tokenAdmin;

    @BeforeEach
    void crearAdmin() {
        String email = "admin-" + UUID.randomUUID() + "@vitalys.test";
        usuarioRepository.save(new Usuario(email, passwordEncoder.encode(CLAVE), RolUsuario.ADMIN));
        tokenAdmin = login(email);
    }

    private String login(String email) {
        Map<String, Object> body = Map.of("identificador", email, "contrasena", CLAVE);
        return restTemplate
                .postForEntity(urlBase() + "/api/auth/login", body, LoginResponse.class)
                .getBody()
                .getToken();
    }

    private static String dniNuevo() {
        return String.valueOf(ThreadLocalRandom.current().nextInt(10_000_000, 99_999_999));
    }

    private static Map<String, Object> alta(String email, String dni, boolean gym) {
        Map<String, Object> datos = new LinkedHashMap<>();
        datos.put("nombre", "Pedro");
        datos.put("apellido", "Gómez");
        datos.put("dni", dni);
        datos.put("telefono", "11-2006-0006");
        datos.put("esSocioGym", gym);
        datos.put("fechaInicioMembresia", gym ? "2026-10-01" : null);
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("email", email);
        body.put("contrasena", CLAVE);
        body.put("datos", datos);
        return body;
    }

    private <T> ResponseEntity<T> llamar(HttpMethod metodo, String ruta, Object body, String token, Class<T> tipo) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        return restTemplate.exchange(urlBase() + ruta, metodo, new HttpEntity<>(body, headers), tipo);
    }

    private PersonaResponse crearPersona(String email, String dni) {
        ResponseEntity<PersonaResponse> r =
                llamar(HttpMethod.POST, "/api/personas", alta(email, dni, true), tokenAdmin, PersonaResponse.class);
        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        return r.getBody();
    }

    // ------------------------------------------------------------------ RF-43: cuota, servicios y filtro de deuda

    private PersonaResponse[] listar(String query) {
        return llamar(HttpMethod.GET, "/api/personas" + query, null, tokenAdmin, PersonaResponse[].class).getBody();
    }

    private PersonaResponse crearSocioConInicio(String email, String dni, boolean gym, String inicio) {
        Map<String, Object> body = alta(email, dni, gym);
        ((Map<String, Object>) body.get("datos")).put("fechaInicioMembresia", gym ? inicio : null);
        ResponseEntity<PersonaResponse> r = llamar(HttpMethod.POST, "/api/personas", body, tokenAdmin, PersonaResponse.class);
        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        return r.getBody();
    }

    private static PersonaResponse buscar(PersonaResponse[] lista, Long id) {
        return java.util.Arrays.stream(lista).filter(p -> p.id().equals(id)).findFirst().orElseThrow();
    }

    @Test
    void pi132_pi133_listadoConCuotaServiciosYFiltroDeDeuda() {
        String marca = UUID.randomUUID().toString().substring(0, 8);
        LocalDate hoy = LocalDate.now(java.time.ZoneId.of("America/Argentina/Buenos_Aires"));
        PersonaResponse alDia = crearSocioConInicio("aldia-" + marca + "@mail.test", dniNuevo(), true, hoy.withDayOfMonth(1).toString());
        PersonaResponse suspendida =
                crearSocioConInicio("susp-" + marca + "@mail.test", dniNuevo(), true, hoy.withDayOfMonth(1).minusMonths(9).toString());
        PersonaResponse soloConsultorio = crearSocioConInicio("cons-" + marca + "@mail.test", dniNuevo(), false, null);

        PersonaResponse[] todas = listar("");
        PersonaResponse a = buscar(todas, alDia.id());
        PersonaResponse s = buscar(todas, suspendida.id());
        PersonaResponse c = buscar(todas, soloConsultorio.id());

        assertThat(a.cuota().periodosImpagos()).isZero();
        assertThat(a.cuota().suspendido()).isFalse();
        assertThat(s.cuota().periodosImpagos()).isGreaterThanOrEqualTo(s.cuota().umbral());
        assertThat(s.cuota().suspendido()).isTrue();
        assertThat(s.cuota().excepcionHasta()).isNull();
        assertThat(c.cuota()).isNull();
        assertThat(java.util.List.of(a, s, c)).allSatisfy(p -> {
            assertThat(p.tieneUsuarioSocio()).isTrue();
            assertThat(p.especialidades()).isEmpty();
        });

        // Con una excepcion vigente deja de estar suspendida y se informa hasta cuando
        LocalDate hasta = hoy.plusDays(5);
        jdbcTemplate.update(
                "INSERT INTO excepciones_morosidad (persona_id, autorizado_por, motivo, valida_hasta, un_solo_uso) "
                        + "VALUES (?, (SELECT id FROM usuarios WHERE rol = 'ADMIN' LIMIT 1), 'plan de pago', ?, false)",
                suspendida.id(),
                hasta);
        PersonaResponse conExcepcion = buscar(listar(""), suspendida.id());
        assertThat(conExcepcion.cuota().suspendido()).isFalse();
        assertThat(conExcepcion.cuota().excepcionHasta()).isEqualTo(hasta);

        // PI-133: "Con deuda" se resuelve en el servidor
        assertThat(listar("?conDeuda=true"))
                .extracting(PersonaResponse::id)
                .contains(suspendida.id())
                .doesNotContain(alDia.id(), soloConsultorio.id());
    }

    @Test
    void pi134_listadoConDeudaEsSoloDelAdmin() {
        String email = "socio-d-" + UUID.randomUUID() + "@mail.test";
        crearPersona(email, dniNuevo());

        assertThat(llamar(HttpMethod.GET, "/api/personas?conDeuda=true", null, login(email), String.class).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void listado_noIncluyeLaFichaDelAdminPeroSiSePuedeObtenerPorId() {
        String emailAdmin = "laura-" + UUID.randomUUID() + "@vitalys.test";
        Usuario admin = usuarioRepository.save(new Usuario(emailAdmin, passwordEncoder.encode(CLAVE), RolUsuario.ADMIN));
        Long personaId = jdbcTemplate.queryForObject(
                "INSERT INTO personas (usuario_id, nombre, apellido, dni) VALUES (?, 'Laura', 'Benítez', ?) RETURNING id",
                Long.class,
                admin.getId(),
                dniNuevo());

        assertThat(listar("")).extracting(PersonaResponse::id).doesNotContain(personaId);
        PersonaResponse ficha =
                llamar(HttpMethod.GET, "/api/personas/" + personaId, null, login(emailAdmin), PersonaResponse.class).getBody();
        assertThat(ficha.nombre()).isEqualTo("Laura");
        assertThat(ficha.tieneUsuarioSocio()).isFalse();
    }

    @Test
    void especialidades_derivanDeLosTurnosDeConsultorioNoCancelados() {
        String marca = UUID.randomUUID().toString().substring(0, 8);
        PersonaResponse persona = crearSocioConInicio("esp-" + marca + "@mail.test", dniNuevo(), false, null);
        Long profesionalId = jdbcTemplate.queryForObject(
                "WITH u AS (INSERT INTO usuarios (email, password_hash, rol) VALUES (?, 'x', 'PROFESIONAL') RETURNING id) "
                        + "INSERT INTO profesionales (usuario_id, nombre, apellido, especialidad, duracion_turno_minutos) "
                        + "SELECT id, 'Flor', 'Rueda', 'KINESIOLOGIA', 45 FROM u RETURNING id",
                Long.class,
                "kine-" + marca + "@vitalys.test");
        jdbcTemplate.update(
                "INSERT INTO turnos (persona_id, profesional_id, tipo_turno, reservado_por_usuario_id, inicio, fin, estado) "
                        + "VALUES (?, ?, 'CONSULTORIO', ?, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days' + INTERVAL '45 minutes', 'COMPLETADO')",
                persona.id(),
                profesionalId,
                persona.usuarioId());

        PersonaResponse listada = buscar(listar(""), persona.id());

        assertThat(listada.especialidades()).extracting(Enum::name).containsExactly("KINESIOLOGIA");
    }

    @Test
    void altaPresencial_creaUsuarioSocioPacienteQuePuedeLoguearse() {
        String email = "pedro-" + UUID.randomUUID() + "@mail.test";
        PersonaResponse creada = crearPersona(email, dniNuevo());

        assertThat(creada.estado().name()).isEqualTo("ACTIVO");
        assertThat(creada.fechaBaja()).isNull();
        assertThat(usuarioRepository.findByEmail(email).orElseThrow().getRol()).isEqualTo(RolUsuario.SOCIO_PACIENTE);
        assertThat(login(email)).isNotBlank();
    }

    @Test
    void bajaLogica_marcaInactivoSinBorrarYReactivarLaRevierte() {
        PersonaResponse creada = crearPersona("baja-" + UUID.randomUUID() + "@mail.test", dniNuevo());
        String ruta = "/api/personas/" + creada.id();

        ResponseEntity<PersonaResponse> baja =
                llamar(HttpMethod.PATCH, ruta + "/baja", null, tokenAdmin, PersonaResponse.class);
        assertThat(baja.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(baja.getBody().estado().name()).isEqualTo("INACTIVO");
        assertThat(baja.getBody().fechaBaja()).isNotNull();

        Integer filas = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM personas WHERE id = ? AND estado = 'INACTIVO'", Integer.class, creada.id());
        assertThat(filas).isEqualTo(1);

        assertThat(llamar(HttpMethod.PATCH, ruta + "/baja", null, tokenAdmin, String.class).getStatusCode())
                .isEqualTo(HttpStatus.CONFLICT);

        ResponseEntity<PersonaResponse> reactivada =
                llamar(HttpMethod.PATCH, ruta + "/reactivar", null, tokenAdmin, PersonaResponse.class);
        assertThat(reactivada.getBody().estado().name()).isEqualTo("ACTIVO");
        assertThat(reactivada.getBody().fechaBaja()).isNull();
    }

    @Test
    void listado_filtraPorEstado() {
        PersonaResponse creada = crearPersona("filtro-" + UUID.randomUUID() + "@mail.test", dniNuevo());
        llamar(HttpMethod.PATCH, "/api/personas/" + creada.id() + "/baja", null, tokenAdmin, String.class);

        ResponseEntity<PersonaResponse[]> activos = llamar(
                HttpMethod.GET, "/api/personas?estado=ACTIVO&q=" + creada.dni(), null, tokenAdmin, PersonaResponse[].class);
        ResponseEntity<PersonaResponse[]> inactivos = llamar(
                HttpMethod.GET, "/api/personas?estado=INACTIVO&q=" + creada.dni(), null, tokenAdmin, PersonaResponse[].class);

        assertThat(activos.getBody()).isEmpty();
        assertThat(inactivos.getBody()).extracting(PersonaResponse::id).containsExactly(creada.id());
    }

    @Test
    void dniRepetido_porApi_devuelve409YNoCreaElUsuario() {
        String dni = dniNuevo();
        crearPersona("dni1-" + UUID.randomUUID() + "@mail.test", dni);
        String segundoEmail = "dni2-" + UUID.randomUUID() + "@mail.test";

        ResponseEntity<String> r =
                llamar(HttpMethod.POST, "/api/personas", alta(segundoEmail, dni, false), tokenAdmin, String.class);

        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(usuarioRepository.findByEmail(segundoEmail)).isEmpty();
    }

    @Test
    void dniRepetido_directoEnLaBase_loRechazaElMotor() {
        String dni = dniNuevo();
        crearPersona("motor-" + UUID.randomUUID() + "@mail.test", dni);
        Usuario otro = usuarioRepository.save(
                new Usuario("motor2-" + UUID.randomUUID() + "@mail.test", "x", RolUsuario.SOCIO_PACIENTE));

        assertThatThrownBy(() -> jdbcTemplate.update(
                        "INSERT INTO personas (usuario_id, nombre, apellido, dni) VALUES (?, 'X', 'Y', ?)", otro.getId(), dni))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void bajaSinFecha_laRechazaChkFechaBaja() {
        PersonaResponse creada = crearPersona("chk-" + UUID.randomUUID() + "@mail.test", dniNuevo());

        assertThatThrownBy(() -> jdbcTemplate.update(
                        "UPDATE personas SET estado = 'INACTIVO', fecha_baja = NULL WHERE id = ?", creada.id()))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void socioGymSinFechaDeMembresia_devuelve400() {
        Map<String, Object> body = alta("sinfecha-" + UUID.randomUUID() + "@mail.test", dniNuevo(), true);
        ((Map<String, Object>) body.get("datos")).put("fechaInicioMembresia", null);

        assertThat(llamar(HttpMethod.POST, "/api/personas", body, tokenAdmin, String.class).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void socioPaciente_noListaPeroSiLeeSuPropiaFicha() {
        String email = "propia-" + UUID.randomUUID() + "@mail.test";
        PersonaResponse propia = crearPersona(email, dniNuevo());
        String tokenSocio = login(email);

        assertThat(llamar(HttpMethod.GET, "/api/personas", null, tokenSocio, String.class).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(llamar(HttpMethod.GET, "/api/personas/" + propia.id(), null, tokenSocio, PersonaResponse.class)
                        .getStatusCode())
                .isEqualTo(HttpStatus.OK);
        assertThat(llamar(HttpMethod.PATCH, "/api/personas/" + propia.id() + "/baja", null, tokenSocio, String.class)
                        .getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void personaInexistente_devuelve404() {
        assertThat(llamar(HttpMethod.GET, "/api/personas/999999", null, tokenAdmin, String.class).getStatusCode())
                .isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void edicion_actualizaDatosYRespetaUnicidad() {
        PersonaResponse a = crearPersona("ed1-" + UUID.randomUUID() + "@mail.test", dniNuevo());
        PersonaResponse b = crearPersona("ed2-" + UUID.randomUUID() + "@mail.test", dniNuevo());
        Map<String, Object> datos = new LinkedHashMap<>((Map<String, Object>) alta("x@x.x", a.dni(), false).get("datos"));
        datos.put("nombre", "Pedro Luis");

        ResponseEntity<PersonaResponse> ok =
                llamar(HttpMethod.PUT, "/api/personas/" + a.id(), datos, tokenAdmin, PersonaResponse.class);
        assertThat(ok.getBody().nombre()).isEqualTo("Pedro Luis");
        assertThat(ok.getBody().esSocioGym()).isFalse();
        assertThat(ok.getBody().fechaInicioMembresia()).isNull();

        datos.put("dni", b.dni());
        assertThat(llamar(HttpMethod.PUT, "/api/personas/" + a.id(), datos, tokenAdmin, String.class).getStatusCode())
                .isEqualTo(HttpStatus.CONFLICT);
    }
}
