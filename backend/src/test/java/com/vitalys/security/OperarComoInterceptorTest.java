package com.vitalys.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.vitalys.domain.RolUsuario;
import com.vitalys.domain.Usuario;
import com.vitalys.exception.AccesoDenegadoException;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.servlet.HandlerMapping;

/** D7: durante "Operar como" solo pasan lecturas y las escrituras de la lista blanca. */
class OperarComoInterceptorTest {

    private final ActorActual actorActual = new ActorActual();
    private final OperarComoInterceptor interceptor = new OperarComoInterceptor(actorActual);

    @AfterEach
    void limpiar() {
        SecurityContextHolder.clearContext();
    }

    private static Usuario usuario(Long id, RolUsuario rol) {
        Usuario u = new Usuario("u" + id + "@vitalys.test", "hash", rol);
        u.setId(id);
        return u;
    }

    private void operando() {
        SecurityContextHolder.getContext().setAuthentication(new OperarComoAuthentication(
                usuario(7L, RolUsuario.SOCIO_PACIENTE), usuario(1L, RolUsuario.ADMIN), UUID.randomUUID(), Instant.now()));
    }

    private boolean pasa(String metodo, String patron) {
        MockHttpServletRequest request = new MockHttpServletRequest(metodo, "/x");
        if (patron != null) {
            request.setAttribute(HandlerMapping.BEST_MATCHING_PATTERN_ATTRIBUTE, patron);
        }
        return interceptor.preHandle(request, new MockHttpServletResponse(), new Object());
    }

    @Test
    void sinOperarComo_todoPasa() {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                usuario(1L, RolUsuario.ADMIN), null, usuario(1L, RolUsuario.ADMIN).getAuthorities()));

        assertThat(pasa("POST", "/api/pagos")).isTrue();
        assertThat(pasa("DELETE", "/api/profesionales/{id}")).isTrue();
        SecurityContextHolder.clearContext();
        assertThat(pasa("POST", "/api/auth/login")).isTrue();
    }

    @Test
    void operando_lecturasPasan() {
        operando();
        assertThat(pasa("GET", "/api/personas")).isTrue();
        assertThat(pasa("HEAD", "/api/turnos/mis-turnos")).isTrue();
        assertThat(pasa("OPTIONS", "/api/pagos")).isTrue();
    }

    @Test
    void operando_escriturasDeLaListaBlancaPasan() {
        operando();
        assertThat(pasa("POST", "/api/turnos/gym")).isTrue();
        assertThat(pasa("POST", "/api/turnos")).isTrue();
        assertThat(pasa("PATCH", "/api/turnos/{id}/cancelar")).isTrue();
        assertThat(pasa("POST", "/api/operar-como/fin")).isTrue();
    }

    @Test
    void operando_cualquierOtraEscrituraEs403() {
        operando();
        String[][] casos = {
            {"POST", "/api/pagos"},
            {"POST", "/api/personas"},
            {"PUT", "/api/personas/{id}"},
            {"PATCH", "/api/turnos/{id}/completado"},
            {"DELETE", "/api/profesionales/{id}"},
            {"POST", "/api/admin/operar-como"},
            {"PUT", "/api/turnos/gym"},
            {"PATCH", "/api/turnos/gym"},
            {"POST", "/api/turnos/{id}/cancelar"},
            {"POST", null}
        };
        for (String[] caso : casos) {
            assertThatThrownBy(() -> pasa(caso[0], caso[1]))
                    .as(caso[0] + " " + caso[1])
                    .isInstanceOf(AccesoDenegadoException.class)
                    .hasMessageContaining("operás como socio");
        }
    }

    @Test
    void actorActual_fueraDeOperarComo_quienOperaEsElActor() {
        Usuario socio = usuario(7L, RolUsuario.SOCIO_PACIENTE);
        assertThat(actorActual.operando()).isFalse();
        assertThat(actorActual.operador()).isEmpty();
        assertThat(actorActual.idDeQuienOpera(socio)).isEqualTo(7L);

        operando();
        assertThat(actorActual.operando()).isTrue();
        assertThat(actorActual.idDeQuienOpera(socio)).isEqualTo(1L);
    }
}
