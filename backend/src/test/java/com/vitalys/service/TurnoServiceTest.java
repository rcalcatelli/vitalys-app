package com.vitalys.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.vitalys.domain.DisponibilidadProfesional;
import com.vitalys.domain.EstadoTurno;
import com.vitalys.domain.ExcepcionMorosidad;
import com.vitalys.domain.Persona;
import com.vitalys.domain.Profesional;
import com.vitalys.domain.RolUsuario;
import com.vitalys.domain.TipoTurno;
import com.vitalys.domain.Turno;
import com.vitalys.domain.Usuario;
import com.vitalys.dto.EstadoGymResponse;
import com.vitalys.dto.FranjaGymResponse;
import com.vitalys.dto.ReservaConsultorioRequest;
import com.vitalys.dto.ReservaGymRequest;
import com.vitalys.dto.SlotConsultorioResponse;
import com.vitalys.dto.TurnoResponse;
import com.vitalys.exception.AccesoDenegadoException;
import com.vitalys.exception.ConflictoException;
import com.vitalys.exception.DatosInvalidosException;
import com.vitalys.exception.RecursoNoEncontradoException;
import com.vitalys.exception.ReglaDeNegocioException;
import com.vitalys.repository.DisponibilidadProfesionalRepository;
import com.vitalys.repository.ExcepcionMorosidadRepository;
import com.vitalys.repository.FeriadoRepository;
import com.vitalys.repository.PersonaRepository;
import com.vitalys.repository.ProfesionalRepository;
import com.vitalys.repository.TurnoRepository;
import com.vitalys.service.MorosidadService.EstadoDeuda;
import java.sql.SQLException;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.jdbc.core.JdbcTemplate;

/** TU-03 a TU-06, TU-08 y TU-10 (definicion-pruebas.md) y las reglas de asistencia del gimnasio. */
class TurnoServiceTest {

    private static final ZoneId ZONA = ZoneId.of("America/Argentina/Buenos_Aires");
    private static final OffsetDateTime AHORA = OffsetDateTime.parse("2026-10-20T09:00:00-03:00");
    private static final OffsetDateTime LUNES_10 = OffsetDateTime.parse("2026-10-26T10:00:00-03:00");

    private TurnoRepository turnoRepository;
    private PersonaRepository personaRepository;
    private ExcepcionMorosidadRepository excepcionRepository;
    private FeriadoRepository feriadoRepository;
    private MorosidadService morosidadService;
    private JdbcTemplate jdbcTemplate;
    private ProfesionalRepository profesionalRepository;
    private DisponibilidadProfesionalRepository disponibilidadRepository;
    private TurnoService service;

    private final Usuario admin = usuario(1L, RolUsuario.ADMIN);
    private final Usuario socio = usuario(2L, RolUsuario.SOCIO_PACIENTE);
    private final Usuario otroSocio = usuario(3L, RolUsuario.SOCIO_PACIENTE);
    private final Usuario profesional = usuario(4L, RolUsuario.PROFESIONAL);
    private Persona personaSocio;

    @BeforeEach
    void setUp() {
        turnoRepository = mock(TurnoRepository.class);
        personaRepository = mock(PersonaRepository.class);
        excepcionRepository = mock(ExcepcionMorosidadRepository.class);
        feriadoRepository = mock(FeriadoRepository.class);
        morosidadService = mock(MorosidadService.class);
        jdbcTemplate = mock(JdbcTemplate.class);
        profesionalRepository = mock(ProfesionalRepository.class);
        disponibilidadRepository = mock(DisponibilidadProfesionalRepository.class);
        service = new TurnoService(
                turnoRepository,
                personaRepository,
                excepcionRepository,
                feriadoRepository,
                morosidadService,
                profesionalRepository,
                disponibilidadRepository,
                jdbcTemplate,
                Clock.fixed(AHORA.toInstant(), ZONA));

        personaSocio = new Persona(socio, LocalDate.of(2024, 1, 1));
        personaSocio.setId(20L);
        personaSocio.setNombre("María");
        personaSocio.setApellido("Pérez");
        personaSocio.definirMembresiaGym(true, LocalDate.of(2026, 1, 1));
        when(personaRepository.findByUsuarioId(2L)).thenReturn(Optional.of(personaSocio));
        when(personaRepository.findById(20L)).thenReturn(Optional.of(personaSocio));
        when(morosidadService.evaluar(any())).thenReturn(new EstadoDeuda(0, 6, false));
        when(turnoRepository.saveAndFlush(any(Turno.class))).thenAnswer(inv -> {
            Turno t = inv.getArgument(0);
            if (t != null && t.getId() == null) {
                t.setId(100L);
            }
            return t;
        });
    }

    private static Usuario usuario(Long id, RolUsuario rol) {
        Usuario u = new Usuario("u" + id + "@mail.com", "x", rol);
        u.setId(id);
        return u;
    }

    private Turno turnoDelSocio(OffsetDateTime inicio) {
        Turno t = Turno.deGimnasio(personaSocio, 2L, inicio);
        t.setId(100L);
        when(turnoRepository.findById(100L)).thenReturn(Optional.of(t));
        return t;
    }

    // ------------------------------------------------------------------ reserva

    @Test
    void tu10_socioReservaGym_sinProfesionalYParaSiMismo() {
        TurnoResponse r = service.reservarGym(socio, new ReservaGymRequest(LUNES_10, null));

        assertThat(r.tipoTurno()).isEqualTo(TipoTurno.GYM);
        assertThat(r.profesionalId()).isNull();
        assertThat(r.personaId()).isEqualTo(20L);
        assertThat(r.estado()).isEqualTo(EstadoTurno.RESERVADO);
        assertThat(r.fin()).isEqualTo(LUNES_10.plusHours(1));
    }

    @Test
    void tu08_deudaPorDebajoDelUmbral_reservaSinConsultarExcepciones() {
        when(morosidadService.evaluar(any())).thenReturn(new EstadoDeuda(2, 6, false));

        service.reservarGym(socio, new ReservaGymRequest(LUNES_10, null));

        verify(excepcionRepository, never()).findByPersonaIdOrderByCreadoEnDesc(anyLong());
    }

    @Test
    void tu05_suspendidoSinExcepcion_lanza422() {
        when(morosidadService.evaluar(any())).thenReturn(new EstadoDeuda(6, 6, true));
        when(excepcionRepository.findByPersonaIdOrderByCreadoEnDesc(20L)).thenReturn(List.of());

        assertThatThrownBy(() -> service.reservarGym(socio, new ReservaGymRequest(LUNES_10, null)))
                .isInstanceOf(ReglaDeNegocioException.class)
                .hasMessageContaining("6 períodos impagos");
        verify(turnoRepository, never()).saveAndFlush(any());
    }

    @Test
    void tu06_suspendidoConExcepcionDeUnSoloUso_reservaYLaConsume() {
        when(morosidadService.evaluar(any())).thenReturn(new EstadoDeuda(7, 6, true));
        ExcepcionMorosidad vencida = new ExcepcionMorosidad(20L, 1L, "vieja", LocalDate.of(2026, 10, 1), false);
        ExcepcionMorosidad vigente = new ExcepcionMorosidad(20L, 1L, "plan de pago", LocalDate.of(2026, 10, 31), true);
        when(excepcionRepository.findByPersonaIdOrderByCreadoEnDesc(20L)).thenReturn(List.of(vencida, vigente));

        service.reservarGym(socio, new ReservaGymRequest(LUNES_10, null));

        assertThat(vigente.getTurnoId()).isEqualTo(100L);
        verify(excepcionRepository).save(vigente);
    }

    @Test
    void reservaDeUnaFranjaQueYaEmpezo_lanza422() {
        assertThatThrownBy(() -> service.reservarGym(socio, new ReservaGymRequest(AHORA, null)))
                .isInstanceOf(ReglaDeNegocioException.class);
    }

    @Test
    void socioQueReservaParaOtraPersona_lanza403() {
        assertThatThrownBy(() -> service.reservarGym(socio, new ReservaGymRequest(LUNES_10, 99L)))
                .isInstanceOf(AccesoDenegadoException.class);
    }

    @Test
    void socioSinFicha_lanza422() {
        assertThatThrownBy(() -> service.reservarGym(otroSocio, new ReservaGymRequest(LUNES_10, null)))
                .isInstanceOf(ReglaDeNegocioException.class)
                .hasMessageContaining("ficha");
    }

    @Test
    void adminReservaParaUnaPersona_yDebeIndicarla() {
        assertThat(service.reservarGym(admin, new ReservaGymRequest(LUNES_10, 20L)).personaId()).isEqualTo(20L);
        assertThatThrownBy(() -> service.reservarGym(admin, new ReservaGymRequest(LUNES_10, null)))
                .isInstanceOf(DatosInvalidosException.class);
        assertThatThrownBy(() -> service.reservarGym(admin, new ReservaGymRequest(LUNES_10, 404L)))
                .isInstanceOf(RecursoNoEncontradoException.class);
    }

    @Test
    void profesionalNoReservaGimnasio() {
        assertThatThrownBy(() -> service.reservarGym(profesional, new ReservaGymRequest(LUNES_10, null)))
                .isInstanceOf(AccesoDenegadoException.class);
    }

    private static DataIntegrityViolationException rechazoDelMotor(String sqlState, String mensaje) {
        return new DataIntegrityViolationException("x", new RuntimeException(new SQLException(mensaje, sqlState)));
    }

    @Test
    void elMotorRechazaPorCupo_seTraduceA422ConSuMensaje() {
        doThrow(rechazoDelMotor("23514", "ERROR: Cupo completo: la franja ya tiene 20 de 20 lugares ocupados.\n  Where: PL/pgSQL")).when(turnoRepository).saveAndFlush(any(Turno.class));

        assertThatThrownBy(() -> service.reservarGym(socio, new ReservaGymRequest(LUNES_10, null)))
                .isInstanceOf(ReglaDeNegocioException.class)
                .hasMessage("Cupo completo: la franja ya tiene 20 de 20 lugares ocupados.");
    }

    @Test
    void elMotorRechazaLaGrilla_mensajeLegible() {
        doThrow(rechazoDelMotor("23514", "ERROR: new row for relation \"turnos\" violates check constraint \"chk_turno_gym_grilla\"")).when(turnoRepository).saveAndFlush(any(Turno.class));

        assertThatThrownBy(() -> service.reservarGym(socio, new ReservaGymRequest(LUNES_10, null)))
                .isInstanceOf(ReglaDeNegocioException.class)
                .hasMessageContaining("grilla del gimnasio");
    }

    @Test
    void elMotorRechazaOtroCheck_mensajeGenerico() {
        doThrow(rechazoDelMotor("23514", "ERROR: new row for relation \"turnos\" violates check constraint \"chk_turno_fin\"")).when(turnoRepository).saveAndFlush(any(Turno.class));

        assertThatThrownBy(() -> service.reservarGym(socio, new ReservaGymRequest(LUNES_10, null)))
                .hasMessage("El turno no cumple las reglas de reserva");
    }

    @Test
    void superposicionYUnTurnoPorDia_seTraducenA409() {
        doThrow(rechazoDelMotor("23P01", "overlap")).when(turnoRepository).saveAndFlush(any(Turno.class));
        assertThatThrownBy(() -> service.reservarGym(socio, new ReservaGymRequest(LUNES_10, null)))
                .isInstanceOf(ConflictoException.class);

        doThrow(rechazoDelMotor("23505", "dup")).when(turnoRepository).saveAndFlush(any(Turno.class));
        assertThatThrownBy(() -> service.reservarGym(socio, new ReservaGymRequest(LUNES_10, null)))
                .isInstanceOf(ConflictoException.class)
                .hasMessageContaining("ese día").hasMessageContaining("gimnasio");
    }

    @Test
    void unErrorDeBaseSinCodigoConocido_noSeEnmascara() {
        DataIntegrityViolationException sinSql = new DataIntegrityViolationException("raro");
        doThrow(sinSql).when(turnoRepository).saveAndFlush(any(Turno.class));
        assertThatThrownBy(() -> service.reservarGym(socio, new ReservaGymRequest(LUNES_10, null))).isSameAs(sinSql);

        DataIntegrityViolationException fk = rechazoDelMotor("23503", "fk");
        doThrow(fk).when(turnoRepository).saveAndFlush(any(Turno.class));
        assertThatThrownBy(() -> service.reservarGym(socio, new ReservaGymRequest(LUNES_10, null))).isSameAs(fk);
    }

    // ------------------------------------------------------------------ estado de gimnasio

    @Test
    void estadoGym_alDia_noSuspendidoYSinConsultarExcepciones() {
        when(morosidadService.evaluar(any())).thenReturn(new EstadoDeuda(2, 6, false));

        EstadoGymResponse e = service.estadoGym(socio, null);

        assertThat(e).isEqualTo(new EstadoGymResponse(true, false, 2, 6, false));
        verify(excepcionRepository, never()).findByPersonaIdOrderByCreadoEnDesc(anyLong());
    }

    @Test
    void estadoGym_suspendidoSinExcepcion_igualQueLaReserva() {
        when(morosidadService.evaluar(any())).thenReturn(new EstadoDeuda(6, 6, true));
        when(excepcionRepository.findByPersonaIdOrderByCreadoEnDesc(20L)).thenReturn(List.of());

        assertThat(service.estadoGym(socio, null)).isEqualTo(new EstadoGymResponse(true, true, 6, 6, false));
        assertThatThrownBy(() -> service.reservarGym(socio, new ReservaGymRequest(LUNES_10, null)))
                .isInstanceOf(ReglaDeNegocioException.class);
    }

    @Test
    void estadoGym_conExcepcionVigente_noSuspendidoYLaReservaPasa() {
        when(morosidadService.evaluar(any())).thenReturn(new EstadoDeuda(7, 6, true));
        ExcepcionMorosidad vencida = new ExcepcionMorosidad(20L, 1L, "vieja", LocalDate.of(2026, 10, 1), false);
        ExcepcionMorosidad vigente = new ExcepcionMorosidad(20L, 1L, "plan de pago", LocalDate.of(2026, 10, 31), false);
        when(excepcionRepository.findByPersonaIdOrderByCreadoEnDesc(20L)).thenReturn(List.of(vencida, vigente));

        assertThat(service.estadoGym(socio, null)).isEqualTo(new EstadoGymResponse(true, false, 7, 6, true));
        assertThat(service.reservarGym(socio, new ReservaGymRequest(LUNES_10, null)).estado()).isEqualTo(EstadoTurno.RESERVADO);
    }

    @Test
    void estadoGym_excepcionVencida_siguesSuspendido() {
        when(morosidadService.evaluar(any())).thenReturn(new EstadoDeuda(7, 6, true));
        ExcepcionMorosidad vencida = new ExcepcionMorosidad(20L, 1L, "vieja", LocalDate.of(2026, 10, 1), false);
        when(excepcionRepository.findByPersonaIdOrderByCreadoEnDesc(20L)).thenReturn(List.of(vencida));

        assertThat(service.estadoGym(socio, null).suspendido()).isTrue();
    }

    @Test
    void estadoGym_sinMembresia_devuelveCeros() {
        personaSocio.definirMembresiaGym(false, null);
        when(morosidadService.evaluar(any())).thenReturn(EstadoDeuda.SIN_MEMBRESIA);

        assertThat(service.estadoGym(socio, null)).isEqualTo(new EstadoGymResponse(false, false, 0, 0, false));
    }

    @Test
    void estadoGym_roles() {
        assertThat(service.estadoGym(admin, 20L).esSocioGym()).isTrue();
        assertThat(service.estadoGym(socio, 20L).esSocioGym()).isTrue();
        assertThatThrownBy(() -> service.estadoGym(admin, null)).isInstanceOf(DatosInvalidosException.class);
        assertThatThrownBy(() -> service.estadoGym(admin, 404L)).isInstanceOf(RecursoNoEncontradoException.class);
        assertThatThrownBy(() -> service.estadoGym(socio, 99L)).isInstanceOf(AccesoDenegadoException.class);
        assertThatThrownBy(() -> service.estadoGym(profesional, null)).isInstanceOf(AccesoDenegadoException.class);
        assertThatThrownBy(() -> service.estadoGym(otroSocio, null))
                .isInstanceOf(ReglaDeNegocioException.class)
                .hasMessageContaining("ficha");
    }

    // ------------------------------------------------------------------ cancelación

    @Test
    void socioCancelaSuTurnoConAnticipacion_quedaEnTiempo() {
        turnoDelSocio(LUNES_10);

        TurnoResponse r = service.cancelar(socio, 100L, "  viaje  ");

        assertThat(r.estado()).isEqualTo(EstadoTurno.CANCELADO_EN_TIEMPO);
        assertThat(r.motivoCancelacion()).isEqualTo("viaje");
    }

    @Test
    void tu03_socioCancelaTurnoAjeno_lanza403() {
        turnoDelSocio(LUNES_10);
        assertThatThrownBy(() -> service.cancelar(otroSocio, 100L, "x")).isInstanceOf(AccesoDenegadoException.class);
    }

    @Test
    void tu04_cancelarTurnoNoReservado_lanza422() {
        turnoDelSocio(LUNES_10).marcar(EstadoTurno.COMPLETADO);
        assertThatThrownBy(() -> service.cancelar(admin, 100L, "x")).isInstanceOf(ReglaDeNegocioException.class);
    }

    @Test
    void cancelarTurnoInexistente_lanza404() {
        when(turnoRepository.findById(5L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.cancelar(admin, 5L, "x")).isInstanceOf(RecursoNoEncontradoException.class);
    }

    // ------------------------------------------------------------------ asistencia

    @Test
    void checkInDeGimnasio_soloAdminYDesdeQuinceMinutosAntes() {
        turnoDelSocio(AHORA.plusMinutes(10));
        assertThat(service.marcarCompletado(admin, 100L).estado()).isEqualTo(EstadoTurno.COMPLETADO);
    }

    @Test
    void checkInDemasiadoTemprano_lanza422() {
        turnoDelSocio(AHORA.plusMinutes(20));
        assertThatThrownBy(() -> service.marcarCompletado(admin, 100L)).isInstanceOf(ReglaDeNegocioException.class);
    }

    @Test
    void asistenciaDeGimnasio_noLaMarcaUnSocioNiUnProfesional() {
        turnoDelSocio(AHORA);
        assertThatThrownBy(() -> service.marcarCompletado(socio, 100L))
                .isInstanceOf(AccesoDenegadoException.class)
                .hasMessageContaining("administración");
        assertThatThrownBy(() -> service.marcarAusente(profesional, 100L)).isInstanceOf(AccesoDenegadoException.class);
    }

    @Test
    void ausente_soloConElTurnoIniciadoYReservado() {
        turnoDelSocio(AHORA.plusMinutes(1));
        assertThatThrownBy(() -> service.marcarAusente(admin, 100L)).isInstanceOf(ReglaDeNegocioException.class);

        turnoDelSocio(AHORA.minusMinutes(1));
        assertThat(service.marcarAusente(admin, 100L).estado()).isEqualTo(EstadoTurno.AUSENTE);
        assertThatThrownBy(() -> service.marcarAusente(admin, 100L))
                .isInstanceOf(ReglaDeNegocioException.class)
                .hasMessageContaining("AUSENTE");
    }

    @Test
    void consultorio_loMarcaElProfesionalACargo() {
        Turno t = mock(Turno.class);
        when(t.getTipoTurno()).thenReturn(TipoTurno.CONSULTORIO);
        when(t.getProfesionalId()).thenReturn(8L);
        when(t.estaReservado()).thenReturn(true);
        when(t.getInicio()).thenReturn(AHORA.minusMinutes(5));
        when(t.getPersona()).thenReturn(personaSocio);
        when(turnoRepository.findById(200L)).thenReturn(Optional.of(t));
        when(turnoRepository.usuarioDelProfesional(8L)).thenReturn(4L);

        service.marcarCompletado(profesional, 200L);

        verify(t).marcar(EstadoTurno.COMPLETADO);
        when(turnoRepository.usuarioDelProfesional(8L)).thenReturn(99L);
        assertThatThrownBy(() -> service.marcarCompletado(profesional, 200L))
                .isInstanceOf(AccesoDenegadoException.class)
                .hasMessageContaining("profesional a cargo");
    }

    @Test
    void jobDeAusentes_usaElRelojDelServicio() {
        when(turnoRepository.marcarAusentesGym(AHORA)).thenReturn(3);
        assertThat(service.marcarAusentesVencidos()).isEqualTo(3);
    }

    // ------------------------------------------------------------------ consultas

    @Test
    void misTurnos_yDetalle() {
        Turno t = turnoDelSocio(LUNES_10);
        when(turnoRepository.findByPersonaIdOrderByInicioDesc(20L)).thenReturn(List.of(t));

        assertThat(service.misTurnos(socio)).extracting(TurnoResponse::persona).containsExactly("Pérez, María");
        assertThat(service.misTurnos(otroSocio)).isEmpty();
        assertThat(service.obtener(socio, 100L).id()).isEqualTo(100L);
        assertThat(service.obtener(admin, 100L).id()).isEqualTo(100L);
        assertThatThrownBy(() -> service.obtener(otroSocio, 100L)).isInstanceOf(AccesoDenegadoException.class);
    }

    @Test
    void listar_soloAdmin() {
        when(turnoRepository.findAll(any(Specification.class), any(Sort.class))).thenReturn(List.of());

        assertThat(service.listar(admin, TipoTurno.GYM, EstadoTurno.RESERVADO, LocalDate.of(2026, 10, 26), 20L)).isEmpty();
        assertThat(service.listar(admin, null, null, null, null)).isEmpty();
        assertThatThrownBy(() -> service.listar(socio, null, null, null, null)).isInstanceOf(AccesoDenegadoException.class);
    }

    // ------------------------------------------------------------------ cupo

    @Test
    void cupo_lunesTieneCatorceFranjasConSuOcupacion() {
        when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class))).thenReturn(20);
        when(feriadoRepository.findCierrePorFecha(any())).thenReturn(Optional.empty());
        List<Object[]> filas = new java.util.ArrayList<>();
        filas.add(new Object[] {java.sql.Timestamp.from(LUNES_10.toInstant()), 18L});
        filas.add(new Object[] {LUNES_10.plusHours(1), 20L});
        filas.add(new Object[] {LUNES_10.plusHours(2).toInstant(), 3L});
        when(turnoRepository.contarOcupadosGym(any(), any())).thenReturn(filas);

        List<FranjaGymResponse> franjas = service.cupoGym(LocalDate.of(2026, 10, 26));

        assertThat(franjas).hasSize(14);
        assertThat(franjas.get(0).inicio().toLocalTime().getHour()).isEqualTo(7);
        assertThat(franjas.get(13).fin().toLocalTime().getHour()).isEqualTo(21);
        assertThat(franjas.get(3).disponibles()).isEqualTo(2);
        assertThat(franjas.get(4).disponibles()).isZero();
        assertThat(franjas.get(5).ocupados()).isEqualTo(3);
    }

    @Test
    void cupo_sabadoTresFranjas_domingoYFeriadoNinguna() {
        when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class))).thenReturn(20);
        when(turnoRepository.contarOcupadosGym(any(), any())).thenReturn(List.of());
        when(feriadoRepository.findCierrePorFecha(any())).thenReturn(Optional.empty());

        assertThat(service.cupoGym(LocalDate.of(2026, 10, 24))).hasSize(3);
        assertThat(service.cupoGym(LocalDate.of(2026, 10, 25))).isEmpty();

        when(feriadoRepository.findCierrePorFecha(LocalDate.of(2026, 11, 23)))
                .thenReturn(Optional.of(mock(com.vitalys.domain.Feriado.class)));
        assertThat(service.cupoGym(LocalDate.of(2026, 11, 23))).isEmpty();
    }

    // ------------------------------------------------------------------ consultorio

    /** Valentina: Nutrición, 30 minutos, miércoles 09:00 a 11:00. */
    private Profesional nutricionista() {
        Profesional p = new Profesional(profesional);
        p.setId(8L);
        p.setNombre("Valentina");
        p.setApellido("Méndez");
        p.setDuracionTurnoMinutos(30);
        when(profesionalRepository.findById(8L)).thenReturn(Optional.of(p));
        when(profesionalRepository.buscarParaActualizar(8L)).thenReturn(Optional.of(p));
        when(disponibilidadRepository.findByProfesionalIdOrderByDiaSemanaAscHoraInicioAsc(8L))
                .thenReturn(List.of(new DisponibilidadProfesional(p, 3, LocalTime.of(9, 0), LocalTime.of(11, 0))));
        return p;
    }

    private static final LocalDate MIERCOLES = LocalDate.of(2026, 10, 28);
    private static final OffsetDateTime MIERCOLES_9 = OffsetDateTime.parse("2026-10-28T09:00:00-03:00");

    @Test
    void slots_partenLaFranjaPorDuracionYMarcanLosTomados() {
        nutricionista();
        List<Object[]> ocupados = new java.util.ArrayList<>();
        ocupados.add(new Object[] {MIERCOLES_9.plusHours(1), MIERCOLES_9.plusMinutes(90)});
        when(turnoRepository.ocupadosDeProfesional(eq(8L), any(), any())).thenReturn(ocupados);

        List<SlotConsultorioResponse> slots = service.slotsDisponibles(8L, MIERCOLES);

        assertThat(slots).hasSize(4);
        assertThat(slots).extracting(SlotConsultorioResponse::libre).containsExactly(true, true, false, true);
        assertThat(slots.get(3).fin()).isEqualTo(MIERCOLES_9.plusHours(2));
    }

    @Test
    void slots_diaSinFranjaOProfesionalInactivo_vacio() {
        Profesional p = nutricionista();
        assertThat(service.slotsDisponibles(8L, MIERCOLES.plusDays(1))).isEmpty();
        p.darDeBaja();
        assertThat(service.slotsDisponibles(8L, MIERCOLES)).isEmpty();
        when(profesionalRepository.findById(9L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.slotsDisponibles(9L, MIERCOLES)).isInstanceOf(RecursoNoEncontradoException.class);
    }

    @Test
    void slots_unaFranjaQueNoCierraJustaDescartaElResto() {
        Profesional p = nutricionista();
        List<OffsetDateTime[]> slots = TurnoService.generarSlots(
                List.of(new DisponibilidadProfesional(p, 3, LocalTime.of(23, 0), LocalTime.of(23, 59))), MIERCOLES, 45);
        assertThat(slots).hasSize(1);
    }

    @Test
    void reservaDeConsultorio_tomaElLockYUsaLaDuracionDelProfesional() {
        nutricionista();

        TurnoResponse r = service.reservarConsultorio(socio, new ReservaConsultorioRequest(8L, MIERCOLES_9.plusMinutes(30), null));

        assertThat(r.tipoTurno()).isEqualTo(TipoTurno.CONSULTORIO);
        assertThat(r.profesionalId()).isEqualTo(8L);
        assertThat(r.fin()).isEqualTo(MIERCOLES_9.plusHours(1));
        verify(profesionalRepository).buscarParaActualizar(8L);
    }

    @Test
    void tu07_fueraDeLaDisponibilidad_lanza422() {
        nutricionista();
        assertThatThrownBy(() -> service.reservarConsultorio(socio, new ReservaConsultorioRequest(8L, MIERCOLES_9.plusMinutes(15), null)))
                .isInstanceOf(ReglaDeNegocioException.class)
                .hasMessageContaining("disponibilidad");
        assertThatThrownBy(() -> service.reservarConsultorio(socio, new ReservaConsultorioRequest(8L, MIERCOLES_9.plusHours(2), null)))
                .isInstanceOf(ReglaDeNegocioException.class);
    }

    @Test
    void tu09_socioSuspendidoReservaConsultorioSinQueSeEvalueLaMorosidad() {
        nutricionista();
        when(morosidadService.evaluar(any())).thenReturn(new EstadoDeuda(9, 6, true));

        service.reservarConsultorio(socio, new ReservaConsultorioRequest(8L, MIERCOLES_9, null));

        verify(morosidadService, never()).evaluar(any());
    }

    @Test
    void reservaDeConsultorio_rechazos() {
        Profesional p = nutricionista();
        assertThatThrownBy(() -> service.reservarConsultorio(profesional, new ReservaConsultorioRequest(8L, MIERCOLES_9, null)))
                .isInstanceOf(AccesoDenegadoException.class);
        assertThatThrownBy(() -> service.reservarConsultorio(socio, new ReservaConsultorioRequest(8L, AHORA, null)))
                .isInstanceOf(ReglaDeNegocioException.class);
        when(profesionalRepository.buscarParaActualizar(9L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.reservarConsultorio(socio, new ReservaConsultorioRequest(9L, MIERCOLES_9, null)))
                .isInstanceOf(RecursoNoEncontradoException.class);
        p.darDeBaja();
        assertThatThrownBy(() -> service.reservarConsultorio(socio, new ReservaConsultorioRequest(8L, MIERCOLES_9, null)))
                .isInstanceOf(ReglaDeNegocioException.class)
                .hasMessageContaining("no está atendiendo");
    }

    @Test
    void superposicionDeConsultorio_distingueProfesionalYPersona() {
        nutricionista();
        doThrow(rechazoDelMotor("23P01", "ERROR: conflicting key value violates exclusion constraint \"excl_turnos_overlap\""))
                .when(turnoRepository).saveAndFlush(any(Turno.class));
        assertThatThrownBy(() -> service.reservarConsultorio(socio, new ReservaConsultorioRequest(8L, MIERCOLES_9, null)))
                .hasMessageContaining("profesional ya tiene");

        doThrow(rechazoDelMotor("23P01", "ERROR: conflicting key value violates exclusion constraint \"excl_turnos_persona_overlap\""))
                .when(turnoRepository).saveAndFlush(any(Turno.class));
        assertThatThrownBy(() -> service.reservarConsultorio(socio, new ReservaConsultorioRequest(8L, MIERCOLES_9, null)))
                .hasMessageContaining("persona ya tiene");
    }

    @Test
    void miAgenda_soloDelProfesionalAutenticado() {
        Profesional p = nutricionista();
        when(profesionalRepository.findByUsuarioId(4L)).thenReturn(Optional.of(p));
        Turno t = Turno.deConsultorio(personaSocio, 8L, 2L, MIERCOLES_9, MIERCOLES_9.plusMinutes(30));
        when(turnoRepository.agendaDeProfesional(eq(8L), any(), any())).thenReturn(List.of(t));

        personaSocio.setDni("30111222");
        assertThat(service.miAgenda(profesional, null, null)).singleElement().satisfies(a -> {
            assertThat(a.persona()).isEqualTo("Pérez, María");
            assertThat(a.pacienteDni()).isEqualTo("30111222");
            assertThat(a.personaId()).isEqualTo(20L);
            assertThat(a.estado()).isEqualTo(EstadoTurno.RESERVADO);
        });
        assertThat(service.miAgenda(profesional, MIERCOLES, MIERCOLES)).hasSize(1);
        assertThatThrownBy(() -> service.miAgenda(profesional, MIERCOLES, MIERCOLES.minusDays(1)))
                .isInstanceOf(DatosInvalidosException.class);
        assertThatThrownBy(() -> service.miAgenda(socio, null, null)).isInstanceOf(AccesoDenegadoException.class);
        when(profesionalRepository.findByUsuarioId(4L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.miAgenda(profesional, null, null)).isInstanceOf(RecursoNoEncontradoException.class);
    }
}
