package com.vitalys.integration;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vitalys.config.JwtProperties;
import com.vitalys.domain.RolUsuario;
import com.vitalys.domain.Usuario;
import com.vitalys.dto.LoginResponse;
import com.vitalys.dto.OperarComoResponse;
import com.vitalys.dto.PersonaResponse;
import com.vitalys.dto.ProfesionalResponse;
import com.vitalys.dto.TurnoResponse;
import com.vitalys.repository.UsuarioRepository;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.TreeSet;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import javax.crypto.SecretKey;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.mvc.method.RequestMappingInfo;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;

/**
 * "Operar como" de punta a punta (RF-39, RN-26, RN-27, PI-112..PI-123): emisión, revalidación en
 * cada request, bloqueo de TODO endpoint que no sea del socio, auditoría atómica con la escritura y
 * fin de sesión con revocación.
 */
class OperarComoIT extends IntegrationTestBase {

    private static final ZoneId ZONA = ZoneId.of("America/Argentina/Buenos_Aires");
    private static final String CLAVE = "Admin1234!";

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private JwtProperties jwtProperties;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    @Qualifier("requestMappingHandlerMapping")
    private RequestMappingHandlerMapping handlerMapping;

    private Usuario admin;
    private String tokenAdmin;

    @BeforeEach
    void crearAdmin() {
        String email = "admin-oc-" + UUID.randomUUID() + "@vitalys.test";
        admin = usuarioRepository.save(new Usuario(email, passwordEncoder.encode(CLAVE), RolUsuario.ADMIN));
        tokenAdmin = login(email);
    }

    // ------------------------------------------------------------------ auxiliares

    private String login(String email) {
        return restTemplate
                .postForEntity(urlBase() + "/api/auth/login", Map.of("identificador", email, "contrasena", CLAVE), LoginResponse.class)
                .getBody()
                .getToken();
    }

    private <T> ResponseEntity<T> llamar(HttpMethod metodo, String ruta, Object body, String token, Class<T> tipo) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        return restTemplate.exchange(urlBase() + ruta, metodo, new HttpEntity<>(body, headers), tipo);
    }

    private HttpStatus estado(HttpMethod metodo, String ruta, Object body, String token) {
        return HttpStatus.valueOf(llamar(metodo, ruta, body, token, String.class).getStatusCode().value());
    }

    private record Socio(PersonaResponse persona, String email, String token) {}

    private Socio socio() {
        String email = "socio-oc-" + UUID.randomUUID() + "@mail.test";
        Map<String, Object> datos = new LinkedHashMap<>();
        datos.put("nombre", "María");
        datos.put("apellido", "Operada");
        datos.put("dni", String.valueOf(ThreadLocalRandom.current().nextInt(10_000_000, 99_999_999)));
        datos.put("esSocioGym", true);
        datos.put("fechaInicioMembresia", LocalDate.now(ZONA).withDayOfMonth(1).toString());
        Map<String, Object> body = Map.of("email", email, "contrasena", CLAVE, "datos", datos);
        PersonaResponse persona = llamar(HttpMethod.POST, "/api/personas", body, tokenAdmin, PersonaResponse.class).getBody();
        return new Socio(persona, email, login(email));
    }

    private ResponseEntity<OperarComoResponse> iniciar(String token, Long personaId) {
        return llamar(HttpMethod.POST, "/api/admin/operar-como", Map.of("personaId", personaId), token, OperarComoResponse.class);
    }

    private String operarComo(Socio s) {
        ResponseEntity<OperarComoResponse> r = iniciar(tokenAdmin, s.persona().id());
        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.OK);
        return r.getBody().token();
    }

    private SecretKey clave() {
        return Keys.hmacShaKeyFor(jwtProperties.getSecret().getBytes(StandardCharsets.UTF_8));
    }

    private Claims claims(String token) {
        return Jwts.parser().verifyWith(clave()).build().parseSignedClaims(token).getPayload();
    }

    private UUID sesion(String token) {
        return UUID.fromString(claims(token).getId());
    }

    private List<Map<String, Object>> auditoria(UUID sesion) {
        return jdbcTemplate.queryForList(
                "SELECT accion::text AS accion, operador_usuario_id, sujeto_usuario_id, persona_id, turno_id "
                        + "FROM auditoria_operar_como WHERE sesion_id = ? ORDER BY id",
                sesion);
    }

    private Long usuarioDe(Socio s) {
        return usuarioRepository.findByEmail(s.email()).orElseThrow().getId();
    }

    /**
     * El {@code n}-ésimo día hábil no feriado a partir de mañana, siempre dentro de la ventana de RN-18
     * (hasta 7 días de anticipación); ver {@link DiasDeReserva}.
     */
    private LocalDate diaHabil(int n) {
        return DiasDeReserva.diaHabil(jdbcTemplate, n);
    }

    private static OffsetDateTime franja(LocalDate dia, int hora) {
        return dia.atTime(hora, 0).atZone(ZONA).toOffsetDateTime();
    }

    private ResponseEntity<TurnoResponse> reservarGym(String token, OffsetDateTime inicio) {
        return llamar(HttpMethod.POST, "/api/turnos/gym", Map.of("inicio", inicio.toString()), token, TurnoResponse.class);
    }

    // ------------------------------------------------------------------ inicio (PI-112..PI-116)

    @Test
    void pi112_adminIniciaSobreUnSocio_credencialDeTreintaMinutosAuditada() throws Exception {
        Socio s = socio();

        ResponseEntity<OperarComoResponse> r = iniciar(tokenAdmin, s.persona().id());

        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.OK);
        OperarComoResponse body = r.getBody();
        assertThat(body.persona()).isEqualTo(new OperarComoResponse.PersonaResumen(s.persona().id(), "María", "Operada"));
        assertThat(Duration.between(OffsetDateTime.now(), body.expiraEn()).toMinutes()).isBetween(28L, 30L);

        Claims c = claims(body.token());
        assertThat(c.getSubject()).isEqualTo(s.email());
        assertThat(c.get("rol", String.class)).isEqualTo("SOCIO_PACIENTE");
        assertThat(((Map<?, ?>) c.get("act")).get("sub")).isEqualTo(admin.getEmail());
        assertThat(((Number) ((Map<?, ?>) c.get("act")).get("usuarioId")).longValue()).isEqualTo(admin.getId());
        assertThat(c.getExpiration().getTime() - c.getIssuedAt().getTime()).isEqualTo(1_800_000L);

        assertThat(auditoria(sesion(body.token()))).singleElement().satisfies(fila -> {
            assertThat(fila.get("accion")).isEqualTo("INICIO");
            assertThat(((Number) fila.get("operador_usuario_id")).longValue()).isEqualTo(admin.getId());
            assertThat(((Number) fila.get("sujeto_usuario_id")).longValue()).isEqualTo(usuarioDe(s));
            assertThat(((Number) fila.get("persona_id")).longValue()).isEqualTo(s.persona().id());
            assertThat(fila.get("turno_id")).isNull();
        });

        // /auth/me con la credencial: es el socio, con el operador aparte para el banner
        JsonNode me = objectMapper.readTree(llamar(HttpMethod.GET, "/api/auth/me", null, body.token(), String.class).getBody());
        assertThat(me.get("email").asText()).isEqualTo(s.email());
        assertThat(me.get("rol").asText()).isEqualTo("SOCIO_PACIENTE");
        assertThat(me.get("operadoPor").get("usuarioId").asLong()).isEqualTo(admin.getId());
        assertThat(me.get("operarComoExpiraEn").isNull()).isFalse();
        // Y con la sesión normal del ADMIN, sin operador
        JsonNode meAdmin = objectMapper.readTree(llamar(HttpMethod.GET, "/api/auth/me", null, tokenAdmin, String.class).getBody());
        assertThat(meAdmin.get("operadoPor").isNull()).isTrue();
    }

    @Test
    void pi113_socioOProfesionalNoInician() {
        Socio objetivo = socio();
        Socio otro = socio();
        String emailProfesional = "prof-oc-" + UUID.randomUUID() + "@vitalys.test";
        Map<String, Object> datos = Map.of("nombre", "Nora", "apellido", "Gil", "especialidad", "NUTRICION", "duracionTurnoMinutos", 30);
        llamar(HttpMethod.POST, "/api/profesionales", Map.of("email", emailProfesional, "contrasena", CLAVE, "datos", datos), tokenAdmin, String.class);

        assertThat(estado(HttpMethod.POST, "/api/admin/operar-como", Map.of("personaId", objetivo.persona().id()), otro.token()))
                .isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(estado(HttpMethod.POST, "/api/admin/operar-como", Map.of("personaId", objetivo.persona().id()), login(emailProfesional)))
                .isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(jdbcTemplate.queryForObject(
                        "SELECT COUNT(*) FROM auditoria_operar_como WHERE persona_id = ?", Integer.class, objetivo.persona().id()))
                .isZero();
    }

    @Test
    void pi114_sujetoAdminOProfesional_403() {
        Socio comoAdmin = socio();
        jdbcTemplate.update("UPDATE usuarios SET rol = 'ADMIN' WHERE id = ?", usuarioDe(comoAdmin));
        Socio comoProfesional = socio();
        jdbcTemplate.update("UPDATE usuarios SET rol = 'PROFESIONAL' WHERE id = ?", usuarioDe(comoProfesional));

        assertThat(iniciar(tokenAdmin, comoAdmin.persona().id()).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(iniciar(tokenAdmin, comoProfesional.persona().id()).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void pi115_inexistenteDadoDeBajaODeshabilitado() {
        assertThat(iniciar(tokenAdmin, 999_999_999L).getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);

        Socio deBaja = socio();
        llamar(HttpMethod.PATCH, "/api/personas/" + deBaja.persona().id() + "/baja", null, tokenAdmin, String.class);
        assertThat(iniciar(tokenAdmin, deBaja.persona().id()).getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);

        Socio deshabilitado = socio();
        jdbcTemplate.update("UPDATE usuarios SET activo = FALSE WHERE id = ?", usuarioDe(deshabilitado));
        assertThat(iniciar(tokenAdmin, deshabilitado.persona().id()).getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);

        assertThat(estado(HttpMethod.POST, "/api/admin/operar-como", Map.of(), tokenAdmin)).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void pi116_desdeOperarComoNoSeAnidaNiSeRenueva() {
        Socio s = socio();
        Socio otro = socio();
        String credencial = operarComo(s);

        assertThat(iniciar(credencial, otro.persona().id()).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(iniciar(credencial, s.persona().id()).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        // La sesión actual sigue igual: una sola fila (INICIO) y la credencial sigue sirviendo
        assertThat(auditoria(sesion(credencial))).hasSize(1);
        assertThat(estado(HttpMethod.GET, "/api/turnos/mis-turnos", null, credencial)).isEqualTo(HttpStatus.OK);
    }

    // ------------------------------------------------------------------ PI-117/PI-119: todo endpoint

    private record Llamada(HttpMethod metodo, String ruta, Object body, HttpStatus esperado) {}

    /**
     * PI-117 y PI-119 sobre TODA la API: se enumeran los endpoints reales desde el
     * {@code RequestMappingHandlerMapping}, así que un endpoint nuevo sin clasificar hace fallar el
     * test. Con la credencial de "Operar como", todo lo que no es del socio da 403 (lo exclusivo de
     * ADMIN, lo del PROFESIONAL, cualquier escritura fuera de la lista blanca y los datos de otro
     * socio); lo propio del socio responde 2xx.
     */
    @Test
    void pi117_pi119_conLaCredencialTodoLoQueNoEsDelSocioDa403() {
        Socio s = socio();
        Socio otro = socio();
        LocalDate dia = diaHabil(2);
        TurnoResponse turnoAjeno = reservarGym(otro.token(), franja(dia, 10)).getBody();
        TurnoResponse turnoPropio = reservarGym(s.token(), franja(dia, 11)).getBody();
        String emailProfesional = "prof-oc-" + UUID.randomUUID() + "@vitalys.test";
        Map<String, Object> datosProfesional =
                Map.of("nombre", "Nora", "apellido", "Gil", "especialidad", "NUTRICION", "duracionTurnoMinutos", 30);
        ProfesionalResponse profesional = llamar(
                        HttpMethod.POST, "/api/profesionales",
                        Map.of("email", emailProfesional, "contrasena", CLAVE, "datos", datosProfesional),
                        tokenAdmin, ProfesionalResponse.class)
                .getBody();
        String credencial = operarComo(s);

        Long ajena = otro.persona().id();
        Long propia = s.persona().id();
        Long prof = profesional.id();
        Map<String, Object> vacio = Map.of();
        String futuro = franja(diaHabil(3), 9).toString();
        HttpStatus ok = HttpStatus.OK;
        HttpStatus no = HttpStatus.FORBIDDEN;

        Map<String, List<Llamada>> api = new TreeMap<>();
        // Lo del socio: responde 2xx
        api.put("GET /api/auth/me", List.of(new Llamada(HttpMethod.GET, "/api/auth/me", null, ok)));
        api.put("GET /api/feriados", List.of(new Llamada(HttpMethod.GET, "/api/feriados", null, ok)));
        api.put("GET /api/turnos/gym/cupo", List.of(new Llamada(HttpMethod.GET, "/api/turnos/gym/cupo?fecha=" + dia, null, ok)));
        api.put("GET /api/turnos/gym/estado", List.of(
                new Llamada(HttpMethod.GET, "/api/turnos/gym/estado", null, ok),
                new Llamada(HttpMethod.GET, "/api/turnos/gym/estado?personaId=" + propia, null, ok),
                new Llamada(HttpMethod.GET, "/api/turnos/gym/estado?personaId=" + ajena, null, no)));
        api.put("GET /api/turnos/disponibles", List.of(
                new Llamada(HttpMethod.GET, "/api/turnos/disponibles?profesionalId=" + prof + "&fecha=" + dia, null, ok)));
        api.put("GET /api/turnos/consultorio/proxima-agenda", List.of(
                new Llamada(HttpMethod.GET, "/api/turnos/consultorio/proxima-agenda", null, ok)));
        api.put("GET /api/turnos/mis-turnos", List.of(new Llamada(HttpMethod.GET, "/api/turnos/mis-turnos", null, ok)));
        api.put("GET /api/turnos/{id}", List.of(
                new Llamada(HttpMethod.GET, "/api/turnos/" + turnoPropio.id(), null, ok),
                new Llamada(HttpMethod.GET, "/api/turnos/" + turnoAjeno.id(), null, no)));
        api.put("GET /api/pagos/mi-estado-cuenta", List.of(new Llamada(HttpMethod.GET, "/api/pagos/mi-estado-cuenta", null, ok)));
        api.put("GET /api/pagos/persona/{personaId}/estado-cuenta", List.of(
                new Llamada(HttpMethod.GET, "/api/pagos/persona/" + propia + "/estado-cuenta", null, ok),
                new Llamada(HttpMethod.GET, "/api/pagos/persona/" + ajena + "/estado-cuenta", null, no)));
        api.put("GET /api/personas/{id}", List.of(
                new Llamada(HttpMethod.GET, "/api/personas/" + propia, null, ok),
                new Llamada(HttpMethod.GET, "/api/personas/" + ajena, null, no)));
        api.put("GET /api/profesionales", List.of(new Llamada(HttpMethod.GET, "/api/profesionales", null, ok)));
        api.put("GET /api/profesionales/{id}", List.of(new Llamada(HttpMethod.GET, "/api/profesionales/" + prof, null, ok)));
        api.put("GET /api/profesionales/{id}/disponibilidad", List.of(
                new Llamada(HttpMethod.GET, "/api/profesionales/" + prof + "/disponibilidad", null, ok)));
        // Escrituras de la lista blanca: solo sobre lo propio (PI-119)
        api.put("POST /api/turnos/gym", List.of(
                new Llamada(HttpMethod.POST, "/api/turnos/gym", Map.of("inicio", futuro, "personaId", ajena), no)));
        api.put("POST /api/turnos", List.of(new Llamada(
                HttpMethod.POST, "/api/turnos", Map.of("profesionalId", prof, "inicio", futuro, "personaId", ajena), no)));
        api.put("PATCH /api/turnos/{id}/cancelar", List.of(new Llamada(
                HttpMethod.PATCH, "/api/turnos/" + turnoAjeno.id() + "/cancelar", Map.of("motivo", "x"), no)));
        // Exclusivo de ADMIN o de PROFESIONAL, y toda escritura fuera de la lista blanca: 403
        String[][] prohibidos = {
            {"GET", "/api/admin/notificaciones", "/api/admin/notificaciones"},
            {"GET", "/api/admin/resumen-hoy", "/api/admin/resumen-hoy"},
            {"POST", "/api/admin/feriados/sincronizar", "/api/admin/feriados/sincronizar"},
            {"POST", "/api/admin/operar-como", "/api/admin/operar-como"},
            {"POST", "/api/excepciones-morosidad", "/api/excepciones-morosidad"},
            {"GET", "/api/excepciones-morosidad/persona/{id}", "/api/excepciones-morosidad/persona/" + propia},
            {"POST", "/api/pagos", "/api/pagos"},
            {"GET", "/api/personas", "/api/personas"},
            {"POST", "/api/personas", "/api/personas"},
            {"POST", "/api/personas/vincular", "/api/personas/vincular"},
            {"PUT", "/api/personas/{id}", "/api/personas/" + propia},
            {"PATCH", "/api/personas/{id}/baja", "/api/personas/" + propia + "/baja"},
            {"PATCH", "/api/personas/{id}/reactivar", "/api/personas/" + propia + "/reactivar"},
            {"GET", "/api/profesionales/me", "/api/profesionales/me"},
            {"POST", "/api/profesionales", "/api/profesionales"},
            {"PUT", "/api/profesionales/{id}", "/api/profesionales/" + prof},
            {"GET", "/api/profesionales/{id}/baja/impacto", "/api/profesionales/" + prof + "/baja/impacto"},
            {"DELETE", "/api/profesionales/{id}", "/api/profesionales/" + prof},
            {"PATCH", "/api/profesionales/{id}/reactivar", "/api/profesionales/" + prof + "/reactivar"},
            {"POST", "/api/profesionales/{id}/disponibilidad", "/api/profesionales/" + prof + "/disponibilidad"},
            {"PUT", "/api/profesionales/{id}/disponibilidad", "/api/profesionales/" + prof + "/disponibilidad"},
            {"PUT", "/api/profesionales/{id}/disponibilidad/{franjaId}", "/api/profesionales/" + prof + "/disponibilidad/1"},
            {"DELETE", "/api/profesionales/{id}/disponibilidad/{franjaId}", "/api/profesionales/" + prof + "/disponibilidad/1"},
            {"GET", "/api/profesionales/{id}/disponibilidad/{franjaId}/impacto", "/api/profesionales/" + prof + "/disponibilidad/1/impacto"},
            {"POST", "/api/profesionales/{id}/disponibilidad/impacto", "/api/profesionales/" + prof + "/disponibilidad/impacto"},
            {"GET", "/api/turnos", "/api/turnos"},
            {"GET", "/api/turnos/mi-agenda", "/api/turnos/mi-agenda"},
            {"PATCH", "/api/turnos/{id}/completado", "/api/turnos/" + turnoPropio.id() + "/completado"},
            {"PATCH", "/api/turnos/{id}/ausente", "/api/turnos/" + turnoPropio.id() + "/ausente"},
        };
        for (String[] p : prohibidos) {
            HttpMethod metodo = HttpMethod.valueOf(p[0]);
            Object body = metodo == HttpMethod.GET ? null : vacio;
            api.put(p[0] + " " + p[1], List.of(new Llamada(metodo, p[2], body, no)));
        }
        // Públicos y el fin de la sesión (se prueba aparte: terminaría la sesión de este test)
        Set<String> fueraDelBarrido = Set.of(
                "POST /api/auth/registro", "POST /api/auth/login", "GET /api/health", "POST /api/operar-como/fin");

        // Completitud: cada endpoint real está clasificado y no hay clasificaciones de endpoints inexistentes
        Set<String> reales = endpointsDeLaApp();
        Set<String> clasificados = new TreeSet<>(api.keySet());
        clasificados.addAll(fueraDelBarrido);
        assertThat(clasificados).as("endpoints sin clasificar en este test").containsExactlyInAnyOrderElementsOf(reales);

        List<String> fallas = new ArrayList<>();
        api.forEach((endpoint, llamadas) -> {
            for (Llamada ll : llamadas) {
                HttpStatus real = estado(ll.metodo(), ll.ruta(), ll.body(), credencial);
                boolean bien = ll.esperado() == HttpStatus.FORBIDDEN ? real == HttpStatus.FORBIDDEN : real.is2xxSuccessful();
                if (!bien) {
                    fallas.add(ll.metodo() + " " + ll.ruta() + " -> " + real + " (esperado " + ll.esperado() + ")");
                }
            }
        });
        assertThat(fallas).as("respuestas con la credencial de Operar como").isEmpty();

        // Nada se escribió: el turno ajeno sigue reservado, ninguna fila más que el INICIO
        assertThat(jdbcTemplate.queryForObject("SELECT estado::text FROM turnos WHERE id = ?", String.class, turnoAjeno.id()))
                .isEqualTo("RESERVADO");
        assertThat(jdbcTemplate.queryForObject("SELECT estado::text FROM turnos WHERE id = ?", String.class, turnoPropio.id()))
                .isEqualTo("RESERVADO");
        assertThat(auditoria(sesion(credencial))).extracting(f -> f.get("accion")).containsExactly("INICIO");
        // La sesión normal del ADMIN, en cambio, sigue pudiendo
        assertThat(estado(HttpMethod.GET, "/api/admin/resumen-hoy", null, tokenAdmin)).isEqualTo(HttpStatus.OK);
        assertThat(estado(HttpMethod.GET, "/api/personas", null, tokenAdmin)).isEqualTo(HttpStatus.OK);
    }

    private Set<String> endpointsDeLaApp() {
        Set<String> endpoints = new TreeSet<>();
        for (Map.Entry<RequestMappingInfo, HandlerMethod> e : handlerMapping.getHandlerMethods().entrySet()) {
            if (!e.getValue().getBeanType().getPackageName().startsWith("com.vitalys")) {
                continue;
            }
            Set<RequestMethod> metodos = e.getKey().getMethodsCondition().getMethods();
            for (String patron : e.getKey().getPatternValues()) {
                for (RequestMethod m : metodos) {
                    endpoints.add(m.name() + " " + patron);
                }
            }
        }
        return endpoints;
    }

    // ------------------------------------------------------------------ PI-118, PI-121, PI-122

    @Test
    void pi118_pi121_pi122_reservaYCancelacionAuditadasConElAdminRealYLaMarcaParaElSocio() throws Exception {
        Socio s = socio();
        String credencial = operarComo(s);
        UUID sesion = sesion(credencial);

        ResponseEntity<TurnoResponse> reserva = reservarGym(credencial, franja(diaHabil(2), 9));
        assertThat(reserva.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        Long turnoId = reserva.getBody().id();
        assertThat(reserva.getBody().personaId()).isEqualTo(s.persona().id());
        assertThat(reserva.getBody().reservadoPorRecepcion()).isTrue();
        assertThat(jdbcTemplate.queryForObject("SELECT reservado_por_usuario_id FROM turnos WHERE id = ?", Long.class, turnoId))
                .isEqualTo(admin.getId());

        // PI-122: el socio, con su propia sesión, ve la marca y nada que identifique al ADMIN
        ResponseEntity<String> mios = llamar(HttpMethod.GET, "/api/turnos/mis-turnos", null, s.token(), String.class);
        JsonNode turno = objectMapper.readTree(mios.getBody()).get(0);
        assertThat(turno.get("reservadoPorRecepcion").asBoolean()).isTrue();
        assertThat(turno.get("canceladoPorRecepcion").asBoolean()).isFalse();
        assertThat(mios.getBody()).doesNotContain(admin.getEmail()).doesNotContain("reservadoPorUsuarioId");

        ResponseEntity<TurnoResponse> cancelacion = llamar(
                HttpMethod.PATCH, "/api/turnos/" + turnoId + "/cancelar", Map.of("motivo", "Llamó por teléfono"), credencial,
                TurnoResponse.class);
        assertThat(cancelacion.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(cancelacion.getBody().canceladoPorRecepcion()).isTrue();
        assertThat(jdbcTemplate.queryForObject("SELECT cancelado_por_usuario FROM turnos WHERE id = ?", Long.class, turnoId))
                .isEqualTo(admin.getId());

        List<Map<String, Object>> filas = auditoria(sesion);
        assertThat(filas).extracting(f -> f.get("accion")).containsExactly("INICIO", "RESERVA_GYM", "CANCELACION");
        for (Map<String, Object> fila : filas.subList(1, 3)) {
            assertThat(((Number) fila.get("operador_usuario_id")).longValue()).isEqualTo(admin.getId());
            assertThat(((Number) fila.get("sujeto_usuario_id")).longValue()).isEqualTo(usuarioDe(s));
            assertThat(((Number) fila.get("persona_id")).longValue()).isEqualTo(s.persona().id());
            assertThat(((Number) fila.get("turno_id")).longValue()).isEqualTo(turnoId);
        }

        // Lo que el socio hace por sí mismo no lleva marca ni auditoría
        TurnoResponse propio = reservarGym(s.token(), franja(diaHabil(3), 9)).getBody();
        assertThat(propio.reservadoPorRecepcion()).isFalse();
        assertThat(auditoria(sesion)).hasSize(3);
    }

    @Test
    void pi118_conLaCredencialRigenLasReglasDelSocio() {
        Socio s = socio();
        String credencial = operarComo(s);

        // Un ADMIN reserva indicando personaId; el socio no puede reservar para otra persona
        Socio otro = socio();
        Map<String, Object> paraOtro = Map.of("inicio", franja(diaHabil(2), 12).toString(), "personaId", otro.persona().id());
        assertThat(estado(HttpMethod.POST, "/api/turnos/gym", paraOtro, credencial)).isEqualTo(HttpStatus.FORBIDDEN);
        // Pero sí para sí mismo, sin indicarla
        assertThat(reservarGym(credencial, franja(diaHabil(2), 12)).getStatusCode()).isEqualTo(HttpStatus.CREATED);
    }

    @Test
    void pi121_siLaAuditoriaFallaNoQuedaElTurno() {
        Socio s = socio();
        String credencial = operarComo(s);
        // Bloquea solo las filas de reserva de gimnasio: el INICIO ya está y la sesión sigue autenticando
        jdbcTemplate.execute("ALTER TABLE auditoria_operar_como ADD CONSTRAINT prueba_bloquea_reserva_auditada "
                + "CHECK (accion <> 'RESERVA_GYM') NOT VALID");
        try {
            ResponseEntity<String> r =
                    llamar(HttpMethod.POST, "/api/turnos/gym", Map.of("inicio", franja(diaHabil(2), 14).toString()), credencial, String.class);

            assertThat(r.getStatusCode().is5xxServerError()).isTrue();
        } finally {
            jdbcTemplate.execute("ALTER TABLE auditoria_operar_como DROP CONSTRAINT prueba_bloquea_reserva_auditada");
        }
        assertThat(jdbcTemplate.queryForObject("SELECT COUNT(*) FROM turnos WHERE persona_id = ?", Integer.class, s.persona().id()))
                .isZero();
        assertThat(auditoria(sesion(credencial))).extracting(f -> f.get("accion")).containsExactly("INICIO");
    }

    // ------------------------------------------------------------------ PI-120: vencimiento y revalidación

    @Test
    void pi120_credencialVencida_401() {
        Socio s = socio();
        String credencial = operarComo(s);
        Claims c = claims(credencial);
        Date haceUnaHora = new Date(System.currentTimeMillis() - 3_600_000L);
        String vencida = Jwts.builder()
                .claims(c)
                .issuedAt(haceUnaHora)
                .expiration(new Date(haceUnaHora.getTime() + 1_800_000L))
                .signWith(clave())
                .compact();

        assertThat(estado(HttpMethod.GET, "/api/auth/me", null, vencida)).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(estado(HttpMethod.GET, "/api/auth/me", null, credencial)).isEqualTo(HttpStatus.OK);
    }

    @Test
    void pi120_actorDeshabilitadoODegradado_401() {
        Socio s = socio();
        String credencial = operarComo(s);
        assertThat(estado(HttpMethod.GET, "/api/turnos/mis-turnos", null, credencial)).isEqualTo(HttpStatus.OK);

        jdbcTemplate.update("UPDATE usuarios SET rol = 'SOCIO_PACIENTE' WHERE id = ?", admin.getId());
        assertThat(estado(HttpMethod.GET, "/api/turnos/mis-turnos", null, credencial)).isEqualTo(HttpStatus.UNAUTHORIZED);

        jdbcTemplate.update("UPDATE usuarios SET rol = 'ADMIN', activo = FALSE WHERE id = ?", admin.getId());
        assertThat(estado(HttpMethod.GET, "/api/turnos/mis-turnos", null, credencial)).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void pi120_sujetoDeshabilitadoODadoDeBaja_401() {
        Socio s = socio();
        String credencial = operarComo(s);
        jdbcTemplate.update("UPDATE usuarios SET activo = FALSE WHERE id = ?", usuarioDe(s));
        assertThat(estado(HttpMethod.GET, "/api/turnos/mis-turnos", null, credencial)).isEqualTo(HttpStatus.UNAUTHORIZED);

        Socio otro = socio();
        String otraCredencial = operarComo(otro);
        llamar(HttpMethod.PATCH, "/api/personas/" + otro.persona().id() + "/baja", null, tokenAdmin, String.class);
        assertThat(estado(HttpMethod.GET, "/api/turnos/mis-turnos", null, otraCredencial)).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void credencialForjadaSinSesionAuditada_401() {
        Socio s = socio();
        // Firmada con la clave de la app (peor caso) pero nunca emitida por POST /api/admin/operar-como
        String forjada = Jwts.builder()
                .subject(s.email())
                .claim("rol", "SOCIO_PACIENTE")
                .claim("usuarioId", usuarioDe(s))
                .claim("act", Map.of("sub", admin.getEmail(), "usuarioId", admin.getId()))
                .id(UUID.randomUUID().toString())
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + 600_000L))
                .signWith(clave())
                .compact();

        assertThat(estado(HttpMethod.GET, "/api/auth/me", null, forjada)).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void actorQueNoEsAdmin_401AunqueLaSesionExista() {
        Socio s = socio();
        Socio impostor = socio();
        String credencial = operarComo(s);
        Claims c = claims(credencial);
        // Misma sesión auditada, pero el act apunta a otro usuario (un socio)
        String cambiada = Jwts.builder()
                .claims(c)
                .claim("act", Map.of("sub", impostor.email(), "usuarioId", usuarioDe(impostor)))
                .signWith(clave())
                .compact();

        assertThat(estado(HttpMethod.GET, "/api/auth/me", null, cambiada)).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    // ------------------------------------------------------------------ PI-123: fin

    @Test
    void pi123_terminar_auditaElFinRevocaLaCredencialYElAdminSigue() {
        Socio s = socio();
        String credencial = operarComo(s);

        assertThat(estado(HttpMethod.POST, "/api/operar-como/fin", null, credencial)).isEqualTo(HttpStatus.NO_CONTENT);

        assertThat(auditoria(sesion(credencial))).extracting(f -> f.get("accion")).containsExactly("INICIO", "FIN");
        assertThat(estado(HttpMethod.GET, "/api/turnos/mis-turnos", null, credencial)).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(estado(HttpMethod.POST, "/api/operar-como/fin", null, credencial)).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(estado(HttpMethod.GET, "/api/personas", null, tokenAdmin)).isEqualTo(HttpStatus.OK);
        // Con la sesión normal no hay nada que terminar
        assertThat(estado(HttpMethod.POST, "/api/operar-como/fin", null, tokenAdmin)).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
    }
}
