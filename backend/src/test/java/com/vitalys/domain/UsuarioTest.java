package com.vitalys.domain;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

/**
 * Contrato {@link org.springframework.security.core.userdetails.UserDetails} de {@link Usuario}.
 *
 * <p>Estos métodos no los llama el código de la aplicación sino Spring Security, así que un
 * error acá no rompe ninguna compilación: se manifiesta como un fallo de autenticación o, peor,
 * como un control de seguridad que no se aplica. Este test fija el mapeo entre las columnas de
 * {@code usuarios} y lo que Spring Security espera.
 */
class UsuarioTest {

    private Usuario usuario() {
        return new Usuario("socio@vitalys.test", "$2a$10$hash", RolUsuario.SOCIO_PACIENTE);
    }

    @Test
    void getUsername_devuelveElEmail() {
        assertThat(usuario().getUsername()).isEqualTo("socio@vitalys.test");
    }

    @Test
    void getPassword_devuelveElHashNuncaTextoPlano() {
        assertThat(usuario().getPassword()).isEqualTo("$2a$10$hash");
    }

    @Test
    void getAuthorities_anteponeRolePorqueHasRoleLoExige() {
        // La columna usuarios.rol guarda "SOCIO_PACIENTE" sin prefijo, pero hasRole("X") de
        // Spring Security busca la autoridad "ROLE_X". Si este prefijo desaparece, toda regla
        // declarativa por rol deja de aplicar en silencio.
        assertThat(usuario().getAuthorities()).extracting(Object::toString).containsExactly("ROLE_SOCIO_PACIENTE");
    }

    @Test
    void getAuthorities_reflejaElRolDeCadaUsuario() {
        Usuario admin = new Usuario("admin@vitalys.test", "$2a$10$hash", RolUsuario.ADMIN);
        assertThat(admin.getAuthorities()).extracting(Object::toString).containsExactly("ROLE_ADMIN");
    }

    @Test
    void isEnabled_sigueALaColumnaActivo() {
        Usuario u = usuario();
        assertThat(u.isEnabled()).isTrue();

        u.setActivo(false); // baja lógica de la cuenta
        assertThat(u.isEnabled()).isFalse();
        assertThat(u.getActivo()).isFalse();
    }

    @Test
    void flagsNoImplementadasEnElMvpDevuelvenTrue() {
        // El MVP no contempla expiración de cuenta, bloqueo por intentos fallidos ni caducidad
        // de credenciales. Devuelven true a propósito; si alguna pasara a false sin implementar
        // la lógica correspondiente, nadie podría autenticarse.
        Usuario u = usuario();
        assertThat(u.isAccountNonExpired()).isTrue();
        assertThat(u.isAccountNonLocked()).isTrue();
        assertThat(u.isCredentialsNonExpired()).isTrue();
    }

    @Test
    void settersDeIdentidadYCredenciales() {
        Usuario u = new Usuario();
        u.setId(7L);
        u.setEmail("nuevo@vitalys.test");
        u.setPasswordHash("$2a$10$otro");
        u.setRol(RolUsuario.PROFESIONAL);

        assertThat(u.getId()).isEqualTo(7L);
        assertThat(u.getEmail()).isEqualTo("nuevo@vitalys.test");
        assertThat(u.getPasswordHash()).isEqualTo("$2a$10$otro");
        assertThat(u.getRol()).isEqualTo(RolUsuario.PROFESIONAL);
        assertThat(u.getUsername()).isEqualTo("nuevo@vitalys.test");
    }
}
