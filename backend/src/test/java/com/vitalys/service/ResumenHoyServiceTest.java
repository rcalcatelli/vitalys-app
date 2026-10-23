package com.vitalys.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.vitalys.domain.ExcepcionMorosidad;
import com.vitalys.domain.Persona;
import com.vitalys.domain.RolUsuario;
import com.vitalys.domain.Usuario;
import com.vitalys.dto.FranjaGymResponse;
import com.vitalys.dto.ResumenHoyResponse;
import com.vitalys.exception.AccesoDenegadoException;
import com.vitalys.repository.PersonaRepository;
import com.vitalys.service.MorosidadService.EstadoDeuda;
import com.vitalys.service.MorosidadService.VeredictoMorosidad;
import java.time.Clock;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.jdbc.core.JdbcTemplate;

class ResumenHoyServiceTest {

    private static final ZoneId ZONA = ZoneId.of("America/Argentina/Buenos_Aires");
    private static final OffsetDateTime AHORA = OffsetDateTime.parse("2026-10-26T10:20:00-03:00");

    private TurnoService turnoService;
    private MorosidadService morosidadService;
    private PersonaRepository personaRepository;
    private JdbcTemplate jdbcTemplate;
    private ResumenHoyService service;

    private final Usuario admin = new Usuario("admin@vitalys.com", "x", RolUsuario.ADMIN);

    @BeforeEach
    void setUp() {
        turnoService = mock(TurnoService.class);
        morosidadService = mock(MorosidadService.class);
        personaRepository = mock(PersonaRepository.class);
        jdbcTemplate = mock(JdbcTemplate.class);
        service = new ResumenHoyService(
                turnoService, morosidadService, personaRepository, jdbcTemplate, Clock.fixed(AHORA.toInstant(), ZONA));
    }

    private static Persona socio(long id, String nombre) {
        Persona p = new Persona(new Usuario(nombre + "@mail.com", "x", RolUsuario.SOCIO_PACIENTE), LocalDate.of(2024, 1, 1));
        p.setId(id);
        p.setNombre(nombre);
        p.setApellido("Prueba");
        p.setDni("3810000" + id);
        p.definirMembresiaGym(true, LocalDate.of(2026, 1, 1));
        return p;
    }

    @Test
    void armaLosIndicadoresYOrdenaLaAtencionPorDeuda() {
        OffsetDateTime f10 = OffsetDateTime.parse("2026-10-26T10:00:00-03:00");
        when(turnoService.cupoGym(LocalDate.of(2026, 10, 26)))
                .thenReturn(List.of(new FranjaGymResponse(f10, f10.plusHours(1), 20, 7, 13), new FranjaGymResponse(f10.plusHours(1), f10.plusHours(2), 20, 3, 17)));
        when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class), any(Object[].class))).thenReturn(4, 2);
        Persona alDia = socio(1, "Maria");
        Persona conDeuda = socio(2, "Ana");
        Persona suspendido = socio(3, "Juan");
        Persona conExcepcion = socio(4, "Luis");
        when(personaRepository.findAll(any(Specification.class), any(Sort.class)))
                .thenReturn(List.of(alDia, conDeuda, suspendido, conExcepcion));
        when(morosidadService.veredicto(alDia)).thenReturn(new VeredictoMorosidad(new EstadoDeuda(0, 6, false), Optional.empty()));
        when(morosidadService.veredicto(conDeuda)).thenReturn(new VeredictoMorosidad(new EstadoDeuda(2, 6, false), Optional.empty()));
        when(morosidadService.veredicto(suspendido)).thenReturn(new VeredictoMorosidad(new EstadoDeuda(7, 6, true), Optional.empty()));
        ExcepcionMorosidad exc = new ExcepcionMorosidad(4L, 1L, "plan", LocalDate.of(2026, 11, 20), false);
        when(morosidadService.veredicto(conExcepcion)).thenReturn(new VeredictoMorosidad(new EstadoDeuda(6, 6, true), Optional.of(exc)));

        ResumenHoyResponse r = service.resumen(admin);

        assertThat(r.fecha()).isEqualTo(LocalDate.of(2026, 10, 26));
        assertThat(r.turnosGymHoy()).isEqualTo(10);
        assertThat(r.consultasHoy()).isEqualTo(4);
        assertThat(r.enGimnasioAhora()).isEqualTo(2);
        assertThat(r.conDeuda()).isEqualTo(3);
        assertThat(r.suspendidos()).isEqualTo(1);
        assertThat(r.requierenAtencion()).extracting(s -> s.persona()).containsExactly("Prueba, Juan", "Prueba, Luis", "Prueba, Ana");
        assertThat(r.requierenAtencion().get(1).excepcionHasta()).isEqualTo(LocalDate.of(2026, 11, 20));
        assertThat(r.requierenAtencion().get(1).suspendido()).isFalse();
    }

    @Test
    void sinTurnosNiDeudas_todoEnCero() {
        when(turnoService.cupoGym(any())).thenReturn(List.of());
        when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class), any(Object[].class))).thenReturn(null);
        when(personaRepository.findAll(any(Specification.class), any(Sort.class))).thenReturn(List.of());

        ResumenHoyResponse r = service.resumen(admin);

        assertThat(r.turnosGymHoy()).isZero();
        assertThat(r.consultasHoy()).isZero();
        assertThat(r.requierenAtencion()).isEmpty();
    }

    @Test
    void soloAdmin() {
        Usuario socio = new Usuario("s@mail.com", "x", RolUsuario.SOCIO_PACIENTE);
        assertThatThrownBy(() -> service.resumen(socio)).isInstanceOf(AccesoDenegadoException.class);
    }
}
