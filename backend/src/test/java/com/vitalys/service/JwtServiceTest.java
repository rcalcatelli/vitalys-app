package com.vitalys.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.vitalys.config.JwtProperties;
import com.vitalys.domain.RolUsuario;
import com.vitalys.domain.Usuario;
import com.vitalys.security.JwtService;
import java.security.SecureRandom;
import java.util.Base64;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** Unit test de firma/parseo/expiración del JWT (A3.3). Sin contexto Spring. */
class JwtServiceTest {

    private JwtService jwtService;

    @BeforeEach
    void setUp() {
        JwtProperties properties = new JwtProperties();
        properties.setSecret(generarSecretoDeTest());
        properties.setExpirationMs(86_400_000L);
        jwtService = new JwtService(properties);
    }

    private static String generarSecretoDeTest() {
        byte[] bytes = new byte[32];
        new SecureRandom().nextBytes(bytes);
        return Base64.getEncoder().encodeToString(bytes);
    }

    private Usuario usuario() {
        Usuario usuario = new Usuario("user@vitalys.test", "hash-bcrypt", RolUsuario.PROFESIONAL);
        usuario.setId(42L);
        return usuario;
    }

    @Test
    void generarToken_produceTokenParseableConElMismoEmailYRol() {
        Usuario usuario = usuario();

        String token = jwtService.generarToken(usuario);

        assertThat(token).isNotBlank();
        assertThat(jwtService.extraerEmail(token)).isEqualTo("user@vitalys.test");
        assertThat(jwtService.extraerRol(token)).isEqualTo("PROFESIONAL");
        assertThat(jwtService.esValido(token)).isTrue();
    }

    @Test
    void esValido_conTokenMalformado_devuelveFalse() {
        assertThat(jwtService.esValido("esto-no-es-un-jwt")).isFalse();
    }

    @Test
    void esValido_conTokenExpirado_devuelveFalse() {
        JwtProperties properties = new JwtProperties();
        properties.setSecret(generarSecretoDeTest());
        properties.setExpirationMs(-1_000L); // ya vencido al generarse
        JwtService servicioExpirado = new JwtService(properties);

        String tokenExpirado = servicioExpirado.generarToken(usuario());

        assertThat(servicioExpirado.esValido(tokenExpirado)).isFalse();
    }

    @Test
    void esValido_conFirmaDistinta_devuelveFalse() {
        String token = jwtService.generarToken(usuario());

        JwtProperties otrasPropiedades = new JwtProperties();
        otrasPropiedades.setSecret(generarSecretoDeTest());
        otrasPropiedades.setExpirationMs(86_400_000L);
        JwtService otroServicio = new JwtService(otrasPropiedades);

        assertThat(otroServicio.esValido(token)).isFalse();
    }
}
