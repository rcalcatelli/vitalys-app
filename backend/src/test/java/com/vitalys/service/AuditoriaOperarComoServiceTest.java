package com.vitalys.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.vitalys.domain.AccionOperarComo;
import com.vitalys.domain.AuditoriaOperarComo;
import com.vitalys.domain.Persona;
import com.vitalys.domain.RolUsuario;
import com.vitalys.domain.Turno;
import com.vitalys.domain.Usuario;
import com.vitalys.repository.AuditoriaOperarComoRepository;
import com.vitalys.security.ActorActual;
import com.vitalys.security.OperarComoAuthentication;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.core.context.SecurityContextHolder;

/** RN-27: qué se audita, con qué datos, y que un fallo de la auditoría hace fallar la operación. */
class AuditoriaOperarComoServiceTest {

    private static final Instant AHORA = Instant.parse("2026-10-20T12:00:00Z");

    private AuditoriaOperarComoRepository repository;
    private AuditoriaOperarComoService service;
    private Usuario admin;
    private Usuario socio;
    private Turno turno;
    private final UUID sesionId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        repository = mock(AuditoriaOperarComoRepository.class);
        service = new AuditoriaOperarComoService(
                repository, new ActorActual(), Clock.fixed(AHORA, ZoneId.of("America/Argentina/Buenos_Aires")));
        admin = new Usuario("admin@vitalys.test", "hash", RolUsuario.ADMIN);
        admin.setId(1L);
        socio = new Usuario("maria@vitalys.test", "hash", RolUsuario.SOCIO_PACIENTE);
        socio.setId(7L);
        Persona persona = new Persona(socio, LocalDate.of(2024, 1, 1));
        persona.setId(20L);
        turno = Turno.deGimnasio(persona, 1L, OffsetDateTime.parse("2026-10-26T10:00:00-03:00"));
        turno.setId(100L);
    }

    @AfterEach
    void limpiar() {
        SecurityContextHolder.clearContext();
    }

    private OperarComoAuthentication operando() {
        OperarComoAuthentication sesion = new OperarComoAuthentication(socio, admin, sesionId, AHORA.plusSeconds(1800));
        SecurityContextHolder.getContext().setAuthentication(sesion);
        return sesion;
    }

    private AuditoriaOperarComo guardada() {
        ArgumentCaptor<AuditoriaOperarComo> fila = ArgumentCaptor.forClass(AuditoriaOperarComo.class);
        verify(repository).saveAndFlush(fila.capture());
        return fila.getValue();
    }

    @Test
    void fueraDeOperarComo_noAudita() {
        service.registrarSiOpera(AccionOperarComo.RESERVA_GYM, turno);

        verifyNoInteractions(repository);
    }

    @Test
    void pi121_escrituraEnOperarComo_guardaOperadorSujetoPersonaTurnoYMomento() {
        operando();

        service.registrarSiOpera(AccionOperarComo.RESERVA_GYM, turno);

        AuditoriaOperarComo fila = guardada();
        assertThat(fila.getSesionId()).isEqualTo(sesionId);
        assertThat(fila.getOperadorUsuarioId()).isEqualTo(1L);
        assertThat(fila.getSujetoUsuarioId()).isEqualTo(7L);
        assertThat(fila.getPersonaId()).isEqualTo(20L);
        assertThat(fila.getAccion()).isEqualTo(AccionOperarComo.RESERVA_GYM);
        assertThat(fila.getTurnoId()).isEqualTo(100L);
        assertThat(fila.getOcurridoEn().toInstant()).isEqualTo(AHORA);
        assertThat(fila.getId()).isNull();
    }

    @Test
    void inicioYFin_sinTurno() {
        service.registrarInicio(sesionId, 1L, 7L, 20L);
        AuditoriaOperarComo inicio = guardada();
        assertThat(inicio.getAccion()).isEqualTo(AccionOperarComo.INICIO);
        assertThat(inicio.getTurnoId()).isNull();
        assertThat(inicio.getSesionId()).isEqualTo(sesionId);

        repository = mock(AuditoriaOperarComoRepository.class);
        service = new AuditoriaOperarComoService(repository, new ActorActual(), Clock.fixed(AHORA, ZoneId.of("UTC")));
        service.registrarFin(operando(), 20L);
        AuditoriaOperarComo fin = guardada();
        assertThat(fin.getAccion()).isEqualTo(AccionOperarComo.FIN);
        assertThat(fin.getTurnoId()).isNull();
        assertThat(fin.getOperadorUsuarioId()).isEqualTo(1L);
        assertThat(fin.getSujetoUsuarioId()).isEqualTo(7L);
    }

    @Test
    void siLaAuditoriaFalla_laOperacionFalla() {
        operando();
        when(repository.saveAndFlush(any())).thenThrow(new DataIntegrityViolationException("sin lugar"));

        assertThatThrownBy(() -> service.registrarSiOpera(AccionOperarComo.CANCELACION, turno))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("auditoría");
    }
}
