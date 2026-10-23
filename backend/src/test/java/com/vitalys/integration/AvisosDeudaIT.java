package com.vitalys.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.vitalys.domain.RolUsuario;
import com.vitalys.domain.Usuario;
import com.vitalys.dto.LoginResponse;
import com.vitalys.dto.PersonaResponse;
import com.vitalys.repository.UsuarioRepository;
import com.vitalys.service.notificaciones.AvisosDeudaService;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.LinkedHashMap;
import java.util.List;
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
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * PI-109 a PI-111 (RF-37) contra Postgres real: tipo de aviso según el umbral, un solo aviso por
 * período aunque el job corra dos veces, y la base rechaza un segundo aviso del mismo período.
 */
class AvisosDeudaIT extends IntegrationTestBase {

    private static final ZoneId ZONA = ZoneId.of("America/Argentina/Buenos_Aires");
    private static final String CLAVE = "Admin1234!";

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private AvisosDeudaService avisos;

    private String tokenAdmin;

    @BeforeEach
    void admin() {
        String email = "admin-d-" + UUID.randomUUID() + "@vitalys.test";
        usuarioRepository.save(new Usuario(email, passwordEncoder.encode(CLAVE), RolUsuario.ADMIN));
        tokenAdmin = restTemplate
                .postForEntity(urlBase() + "/api/auth/login", Map.of("identificador", email, "contrasena", CLAVE), LoginResponse.class)
                .getBody()
                .getToken();
    }

    /** Socio del gimnasio con la membresía iniciada {@code meses} meses antes del mes actual y sin pagos. */
    private Long socio(int meses) {
        Map<String, Object> datos = new LinkedHashMap<>();
        datos.put("nombre", "Deuda");
        datos.put("apellido", "Prueba");
        datos.put("dni", String.valueOf(ThreadLocalRandom.current().nextInt(10_000_000, 99_999_999)));
        datos.put("esSocioGym", true);
        datos.put("fechaInicioMembresia", LocalDate.now(ZONA).withDayOfMonth(1).minusMonths(meses).toString());
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(tokenAdmin);
        Map<String, Object> body = Map.of("email", "deuda-" + UUID.randomUUID() + "@mail.test", "contrasena", CLAVE, "datos", datos);
        return restTemplate
                .exchange(urlBase() + "/api/personas", HttpMethod.POST, new HttpEntity<>(body, headers), PersonaResponse.class)
                .getBody()
                .id();
    }

    private List<String> avisosDe(Long personaId) {
        return jdbcTemplate.queryForList(
                "SELECT tipo::text FROM notificaciones WHERE persona_id = ? AND periodo IS NOT NULL ORDER BY id",
                String.class,
                personaId);
    }

    @Test
    void pi109_pi110_tipoSegunElUmbralYUnSoloAvisoPorPeriodo() {
        Long conDeuda = socio(2);
        Long suspendido = socio(9);
        Long nuevo = socio(0);

        avisos.avisarDeudas();
        avisos.avisarDeudas();

        assertThat(avisosDe(conDeuda)).containsExactly("AVISO_DEUDA");
        assertThat(avisosDe(suspendido)).containsExactly("AVISO_SUSPENSION");
        assertThat(avisosDe(nuevo)).isEmpty();
    }

    @Test
    void pi111_laBaseRechazaUnSegundoAvisoDelMismoPeriodo() {
        Long persona = socio(9);
        avisos.avisarDeudas();
        LocalDate periodo = jdbcTemplate.queryForObject(
                "SELECT periodo FROM notificaciones WHERE persona_id = ? AND periodo IS NOT NULL", LocalDate.class, persona);

        assertThatThrownBy(() -> jdbcTemplate.update(
                        "INSERT INTO notificaciones (persona_id, tipo, email_destino, periodo) VALUES (?, 'AVISO_DEUDA', 'x@x.x', ?)",
                        persona, periodo))
                .isInstanceOf(DataIntegrityViolationException.class);
        assertThatThrownBy(() -> jdbcTemplate.update(
                        "INSERT INTO notificaciones (persona_id, tipo, email_destino, periodo) VALUES (?, 'RECORDATORIO', 'x@x.x', ?)",
                        persona, periodo.minusMonths(1)))
                .isInstanceOf(DataIntegrityViolationException.class);
    }
}
