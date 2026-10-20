package com.vitalys.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.vitalys.domain.DisponibilidadProfesional;
import com.vitalys.domain.Especialidad;
import com.vitalys.domain.Profesional;
import com.vitalys.domain.RolUsuario;
import com.vitalys.domain.Usuario;
import com.vitalys.dto.ImpactoResponse;
import com.vitalys.dto.ProfesionalAltaRequest;
import com.vitalys.dto.ProfesionalDatosRequest;
import com.vitalys.dto.ProfesionalResponse;
import com.vitalys.dto.TurnoAfectadoResponse;
import com.vitalys.exception.AccesoDenegadoException;
import com.vitalys.exception.ConfirmacionRequeridaException;
import com.vitalys.exception.ConflictoException;
import com.vitalys.exception.EmailDuplicadoException;
import com.vitalys.exception.RecursoNoEncontradoException;
import com.vitalys.repository.DisponibilidadProfesionalRepository;
import com.vitalys.repository.ProfesionalRepository;
import com.vitalys.repository.UsuarioRepository;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;

class ProfesionalServiceTest {

    private ProfesionalRepository profesionalRepository;
    private DisponibilidadProfesionalRepository disponibilidadRepository;
    private CascadaDisponibilidadService cascada;
    private UsuarioRepository usuarioRepository;
    private PasswordEncoder passwordEncoder;
    private ProfesionalService service;

    private final Usuario admin = usuario(1L, "admin@vitalys.com", RolUsuario.ADMIN);
    private final Usuario usuarioProfesional = usuario(2L, "valentina@vitalys.com", RolUsuario.PROFESIONAL);
    private final Usuario socio = usuario(3L, "maria@mail.com", RolUsuario.SOCIO_PACIENTE);

    @BeforeEach
    void setUp() {
        profesionalRepository = mock(ProfesionalRepository.class);
        disponibilidadRepository = mock(DisponibilidadProfesionalRepository.class);
        cascada = mock(CascadaDisponibilidadService.class);
        usuarioRepository = mock(UsuarioRepository.class);
        passwordEncoder = mock(PasswordEncoder.class);
        service = new ProfesionalService(
                profesionalRepository, disponibilidadRepository, cascada, usuarioRepository, passwordEncoder);
        when(profesionalRepository.saveAndFlush(any(Profesional.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    private static Usuario usuario(Long id, String email, RolUsuario rol) {
        Usuario u = new Usuario(email, "hash", rol);
        u.setId(id);
        return u;
    }

    private static Profesional profesional(Long id, Usuario usuario) {
        Profesional p = new Profesional(usuario);
        p.setId(id);
        p.setNombre("Valentina");
        p.setApellido("Méndez");
        p.setEspecialidad(Especialidad.NUTRICION);
        p.setDuracionTurnoMinutos(30);
        return p;
    }

    private static ProfesionalDatosRequest datos() {
        return new ProfesionalDatosRequest(" Rodrigo ", " Almirón ", Especialidad.PSICOLOGIA, 50);
    }

    private static ProfesionalAltaRequest alta(String email) {
        return new ProfesionalAltaRequest(email, "Clave1234", datos());
    }

    // --- listar ---

    @Test
    void listar_comoAdmin_sinFiltro_devuelveTodos() {
        when(profesionalRepository.findAll(any(Sort.class))).thenReturn(List.of(profesional(10L, usuarioProfesional)));

        List<ProfesionalResponse> lista = service.listar(admin, null);

        assertThat(lista).singleElement().satisfies(r -> {
            assertThat(r.apellido()).isEqualTo("Méndez");
            assertThat(r.email()).isEqualTo("valentina@vitalys.com");
            assertThat(r.activo()).isTrue();
        });
    }

    @Test
    void listar_conFiltroDeEstado_usaLaConsultaPorActivo() {
        when(profesionalRepository.findByActivo(eq(false), any(Sort.class))).thenReturn(List.of());

        assertThat(service.listar(admin, false)).isEmpty();
        verify(profesionalRepository).findByActivo(eq(false), any(Sort.class));
    }

    @Test
    void listar_comoNoAdmin_soloActivosYSinEmail() {
        when(profesionalRepository.findByActivo(eq(true), any(Sort.class)))
                .thenReturn(List.of(profesional(10L, usuarioProfesional)));

        // el filtro pedido por un no-ADMIN se ignora: solo ve activos
        List<ProfesionalResponse> lista = service.listar(socio, false);

        assertThat(lista).singleElement().satisfies(r -> {
            assertThat(r.apellido()).isEqualTo("Méndez");
            assertThat(r.email()).isNull();
            assertThat(r.usuarioId()).isNull();
        });
        verify(profesionalRepository, never()).findAll(any(Sort.class));
    }

    // --- obtener ---

    @Test
    void obtener_propiaFicha_estaPermitido() {
        when(profesionalRepository.findById(10L)).thenReturn(Optional.of(profesional(10L, usuarioProfesional)));

        assertThat(service.obtener(usuarioProfesional, 10L).id()).isEqualTo(10L);
    }

    @Test
    void obtener_fichaAjena_comoProfesional_esVistaPublicaSinEmail() {
        Usuario otro = usuario(9L, "otro@vitalys.com", RolUsuario.PROFESIONAL);
        when(profesionalRepository.findById(10L)).thenReturn(Optional.of(profesional(10L, otro)));

        ProfesionalResponse r = service.obtener(usuarioProfesional, 10L);

        assertThat(r.nombre()).isEqualTo("Valentina");
        assertThat(r.email()).isNull();
    }

    @Test
    void obtener_comoSocio_noExponeElEmail() {
        when(profesionalRepository.findById(10L)).thenReturn(Optional.of(profesional(10L, usuarioProfesional)));

        assertThat(service.obtener(socio, 10L).email()).isNull();
    }

    @Test
    void obtener_propiaFicha_incluyeEmail() {
        when(profesionalRepository.findById(10L)).thenReturn(Optional.of(profesional(10L, usuarioProfesional)));

        assertThat(service.obtener(usuarioProfesional, 10L).email()).isEqualTo("valentina@vitalys.com");
    }

    @Test
    void obtener_deBaja_comoNoAdmin_esNoEncontrado() {
        Profesional deBaja = profesional(10L, usuarioProfesional);
        deBaja.darDeBaja();
        when(profesionalRepository.findById(10L)).thenReturn(Optional.of(deBaja));

        assertThatThrownBy(() -> service.obtener(socio, 10L)).isInstanceOf(RecursoNoEncontradoException.class);
    }

    @Test
    void obtener_comoAdmin_cualquierFicha() {
        when(profesionalRepository.findById(10L)).thenReturn(Optional.of(profesional(10L, usuarioProfesional)));

        assertThat(service.obtener(admin, 10L).nombre()).isEqualTo("Valentina");
    }

    @Test
    void obtener_inexistente_lanza404() {
        when(profesionalRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.obtener(admin, 99L)).isInstanceOf(RecursoNoEncontradoException.class);
    }

    // --- /me ---

    @Test
    void miPerfil_comoProfesionalConFicha_devuelveSuFicha() {
        when(profesionalRepository.findByUsuarioId(2L)).thenReturn(Optional.of(profesional(10L, usuarioProfesional)));

        assertThat(service.miPerfil(usuarioProfesional).id()).isEqualTo(10L);
    }

    @Test
    void miPerfil_adminSinProfesional_lanza404() {
        when(profesionalRepository.findByUsuarioId(1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.miPerfil(admin)).isInstanceOf(RecursoNoEncontradoException.class);
    }

    @Test
    void miPerfil_profesionalSinFicha_lanza404() {
        when(profesionalRepository.findByUsuarioId(2L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.miPerfil(usuarioProfesional)).isInstanceOf(RecursoNoEncontradoException.class);
    }

    @Test
    void miPerfil_comoSocio_esRechazado() {
        assertThatThrownBy(() -> service.miPerfil(socio)).isInstanceOf(AccesoDenegadoException.class);
        verifyNoInteractions(profesionalRepository);
    }

    // --- alta ---

    @Test
    void crear_creaUsuarioProfesionalConClaveCifradaYProfesionalActivo() {
        when(usuarioRepository.findByEmail("rodrigo@vitalys.com")).thenReturn(Optional.empty());
        when(passwordEncoder.encode("Clave1234")).thenReturn("bcrypt");
        when(usuarioRepository.saveAndFlush(any(Usuario.class))).thenAnswer(inv -> {
            Usuario u = inv.getArgument(0);
            u.setId(50L);
            return u;
        });

        ProfesionalResponse r = service.crear(admin, alta("rodrigo@vitalys.com"));

        assertThat(r.usuarioId()).isEqualTo(50L);
        assertThat(r.nombre()).isEqualTo("Rodrigo");
        assertThat(r.apellido()).isEqualTo("Almirón");
        assertThat(r.especialidad()).isEqualTo(Especialidad.PSICOLOGIA);
        assertThat(r.duracionTurnoMinutos()).isEqualTo(50);
        assertThat(r.activo()).isTrue();
        verify(usuarioRepository).saveAndFlush(org.mockito.ArgumentMatchers.argThat(
                u -> u.getRol() == RolUsuario.PROFESIONAL && "bcrypt".equals(u.getPasswordHash())));
    }

    @Test
    void crear_emailRepetido_lanza409SinCrearNada() {
        when(usuarioRepository.findByEmail("maria@mail.com")).thenReturn(Optional.of(socio));

        assertThatThrownBy(() -> service.crear(admin, alta("maria@mail.com")))
                .isInstanceOf(EmailDuplicadoException.class);
        verify(usuarioRepository, never()).saveAndFlush(any());
        verifyNoInteractions(profesionalRepository);
    }

    @Test
    void crear_dosAltasSimultaneas_laBaseRechazaElEmailYSeTraduceA409() {
        when(usuarioRepository.findByEmail(any())).thenReturn(Optional.empty());
        when(usuarioRepository.saveAndFlush(any(Usuario.class))).thenThrow(new DataIntegrityViolationException("uk"));

        assertThatThrownBy(() -> service.crear(admin, alta("carrera@vitalys.com")))
                .isInstanceOf(EmailDuplicadoException.class);
        verify(profesionalRepository, never()).saveAndFlush(any());
    }

    @Test
    void crear_siFallaElGuardadoDelProfesional_traduceA409() {
        when(usuarioRepository.findByEmail(any())).thenReturn(Optional.empty());
        when(usuarioRepository.saveAndFlush(any(Usuario.class))).thenAnswer(inv -> inv.getArgument(0));
        when(profesionalRepository.saveAndFlush(any(Profesional.class))).thenThrow(new DataIntegrityViolationException("uk"));

        assertThatThrownBy(() -> service.crear(admin, alta("x@vitalys.com"))).isInstanceOf(ConflictoException.class);
    }

    @Test
    void crear_comoProfesional_esRechazado() {
        assertThatThrownBy(() -> service.crear(usuarioProfesional, alta("x@vitalys.com")))
                .isInstanceOf(AccesoDenegadoException.class);
        verifyNoInteractions(usuarioRepository);
    }

    // --- modificar ---

    @Test
    void actualizar_aplicaLosDatosRecortados() {
        Profesional existente = profesional(10L, usuarioProfesional);
        when(profesionalRepository.findById(10L)).thenReturn(Optional.of(existente));

        ProfesionalResponse r = service.actualizar(admin, 10L, datos());

        assertThat(r.nombre()).isEqualTo("Rodrigo");
        assertThat(r.apellido()).isEqualTo("Almirón");
        assertThat(r.especialidad()).isEqualTo(Especialidad.PSICOLOGIA);
        assertThat(r.duracionTurnoMinutos()).isEqualTo(50);
    }

    @Test
    void actualizar_inexistente_lanza404() {
        when(profesionalRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.actualizar(admin, 99L, datos())).isInstanceOf(RecursoNoEncontradoException.class);
    }

    @Test
    void actualizar_comoProfesional_esRechazado() {
        assertThatThrownBy(() -> service.actualizar(usuarioProfesional, 10L, datos()))
                .isInstanceOf(AccesoDenegadoException.class);
        verifyNoInteractions(profesionalRepository);
    }

    // --- baja (RN-25) ---

    private static ImpactoResponse impactoDeUnTurno() {
        return new ImpactoResponse(
                1,
                List.of(new TurnoAfectadoResponse(
                        7L,
                        3L,
                        "Ana Gómez",
                        OffsetDateTime.parse("2026-11-20T10:00:00-03:00"),
                        OffsetDateTime.parse("2026-11-20T10:30:00-03:00"))));
    }

    @Test
    void darDeBaja_sinTurnosFuturos_borraFranjasYDeshabilitaAlUsuario() {
        Profesional existente = profesional(10L, usuarioProfesional);
        DisponibilidadProfesional franja = new DisponibilidadProfesional(existente, 1, LocalTime.of(9, 0), LocalTime.of(13, 0));
        when(profesionalRepository.buscarParaActualizar(10L)).thenReturn(Optional.of(existente));
        when(disponibilidadRepository.findByProfesionalIdOrderByDiaSemanaAscHoraInicioAsc(10L))
                .thenReturn(List.of(franja));

        ProfesionalResponse r = service.darDeBaja(admin, 10L, false);

        assertThat(r.activo()).isFalse();
        assertThat(usuarioProfesional.getActivo()).isFalse();
        verify(cascada).resolver(eq(admin), eq(existente), eq(List.of()), eq(false), any());
        verify(disponibilidadRepository).deleteAll(List.of(franja));
    }

    @Test
    void darDeBaja_conTurnosFuturosSinConfirmar_lanza409ConImpactoSinTocarNada() {
        Profesional existente = profesional(10L, usuarioProfesional);
        when(profesionalRepository.buscarParaActualizar(10L)).thenReturn(Optional.of(existente));
        when(cascada.resolver(any(), any(), any(), eq(false), any()))
                .thenThrow(new ConfirmacionRequeridaException("hay turnos", impactoDeUnTurno()));

        assertThatThrownBy(() -> service.darDeBaja(admin, 10L, false))
                .isInstanceOfSatisfying(
                        ConfirmacionRequeridaException.class,
                        e -> assertThat(e.getImpacto().cantidad()).isEqualTo(1));

        assertThat(existente.isActivo()).isTrue();
        assertThat(usuarioProfesional.getActivo()).isTrue();
        verify(disponibilidadRepository, never()).deleteAll(any());
        verify(profesionalRepository, never()).saveAndFlush(any());
    }

    @Test
    void darDeBaja_confirmada_cancelaEnCascadaYDaDeBaja() {
        Profesional existente = profesional(10L, usuarioProfesional);
        when(profesionalRepository.buscarParaActualizar(10L)).thenReturn(Optional.of(existente));
        when(cascada.resolver(any(), any(), any(), eq(true), any())).thenReturn(impactoDeUnTurno());

        ProfesionalResponse r = service.darDeBaja(admin, 10L, true);

        assertThat(r.activo()).isFalse();
        assertThat(usuarioProfesional.getActivo()).isFalse();
        verify(cascada).resolver(eq(admin), eq(existente), eq(List.of()), eq(true), any());
    }

    @Test
    void darDeBaja_yaDadoDeBaja_lanza409() {
        Profesional existente = profesional(10L, usuarioProfesional);
        existente.darDeBaja();
        when(profesionalRepository.buscarParaActualizar(10L)).thenReturn(Optional.of(existente));

        assertThatThrownBy(() -> service.darDeBaja(admin, 10L, true)).isInstanceOf(ConflictoException.class);
        verifyNoInteractions(cascada);
    }

    @Test
    void darDeBaja_inexistente_lanza404() {
        when(profesionalRepository.buscarParaActualizar(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.darDeBaja(admin, 99L, false)).isInstanceOf(RecursoNoEncontradoException.class);
    }

    @Test
    void darDeBaja_comoProfesional_esRechazado() {
        assertThatThrownBy(() -> service.darDeBaja(usuarioProfesional, 10L, true)).isInstanceOf(AccesoDenegadoException.class);
        verifyNoInteractions(profesionalRepository);
    }

    @Test
    void impactoDeBaja_consultaTodosLosTurnosFuturos() {
        when(profesionalRepository.findById(10L)).thenReturn(Optional.of(profesional(10L, usuarioProfesional)));
        when(cascada.impacto(10L, List.of())).thenReturn(impactoDeUnTurno());

        assertThat(service.impactoDeBaja(admin, 10L).cantidad()).isEqualTo(1);
    }

    @Test
    void impactoDeBaja_yaDadoDeBaja_409_inexistente_404_noAdmin_403() {
        Profesional deBaja = profesional(10L, usuarioProfesional);
        deBaja.darDeBaja();
        when(profesionalRepository.findById(10L)).thenReturn(Optional.of(deBaja));
        when(profesionalRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.impactoDeBaja(admin, 10L)).isInstanceOf(ConflictoException.class);
        assertThatThrownBy(() -> service.impactoDeBaja(admin, 99L)).isInstanceOf(RecursoNoEncontradoException.class);
        assertThatThrownBy(() -> service.impactoDeBaja(socio, 10L)).isInstanceOf(AccesoDenegadoException.class);
    }
}
