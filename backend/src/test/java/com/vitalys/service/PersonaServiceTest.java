package com.vitalys.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.vitalys.domain.Especialidad;
import com.vitalys.domain.EstadoPersona;
import com.vitalys.domain.Persona;
import com.vitalys.domain.RolUsuario;
import com.vitalys.domain.Usuario;
import com.vitalys.dto.PersonaAltaRequest;
import com.vitalys.dto.PersonaDatosRequest;
import com.vitalys.dto.PersonaResponse;
import com.vitalys.dto.PersonaVinculoRequest;
import com.vitalys.exception.AccesoDenegadoException;
import com.vitalys.exception.ConflictoException;
import com.vitalys.exception.DatosInvalidosException;
import com.vitalys.exception.EmailDuplicadoException;
import com.vitalys.exception.RecursoNoEncontradoException;
import com.vitalys.exception.ReglaDeNegocioException;
import com.vitalys.repository.PersonaRepository;
import com.vitalys.repository.UsuarioRepository;
import com.vitalys.domain.ExcepcionMorosidad;
import com.vitalys.service.MorosidadService.EstadoDeuda;
import com.vitalys.service.MorosidadService.VeredictoMorosidad;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.crypto.password.PasswordEncoder;

class PersonaServiceTest {

    private static final LocalDate HOY = LocalDate.of(2026, 10, 20);

    private PersonaRepository personaRepository;
    private UsuarioRepository usuarioRepository;
    private PasswordEncoder passwordEncoder;
    private MorosidadService morosidadService;
    private PersonaService service;

    private final Usuario admin = usuario(1L, "admin@vitalys.com", RolUsuario.ADMIN);
    private final Usuario socio = usuario(2L, "maria@mail.com", RolUsuario.SOCIO_PACIENTE);

    @BeforeEach
    void setUp() {
        personaRepository = mock(PersonaRepository.class);
        usuarioRepository = mock(UsuarioRepository.class);
        passwordEncoder = mock(PasswordEncoder.class);
        morosidadService = mock(MorosidadService.class);
        Clock clock = Clock.fixed(Instant.parse("2026-10-20T15:00:00Z"), ZoneId.of("America/Argentina/Buenos_Aires"));
        service = new PersonaService(personaRepository, usuarioRepository, passwordEncoder, morosidadService, clock);
        when(personaRepository.saveAndFlush(any(Persona.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    private static Usuario usuario(Long id, String email, RolUsuario rol) {
        Usuario u = new Usuario(email, "hash", rol);
        u.setId(id);
        return u;
    }

    private static Persona persona(Long id, Usuario usuario) {
        Persona p = new Persona(usuario, LocalDate.of(2024, 1, 10));
        p.setId(id);
        p.setNombre("María");
        p.setApellido("Pérez");
        p.setDni("38100001");
        return p;
    }

    private static PersonaDatosRequest datos(String dni, boolean gym, LocalDate inicio) {
        return new PersonaDatosRequest(" Ana ", " López ", dni, "11-0000-0000", LocalDate.of(1999, 1, 1), gym, inicio);
    }

    @Test
    void listar_comoAdmin_devuelvePersonasMapeadas() {
        when(personaRepository.findAll(any(Specification.class), any(Sort.class)))
                .thenReturn(List.of(persona(10L, socio)));

        List<PersonaResponse> lista = service.listar(admin, EstadoPersona.ACTIVO, "pérez", true, false);

        assertThat(lista).singleElement().satisfies(r -> {
            assertThat(r.dni()).isEqualTo("38100001");
            assertThat(r.email()).isEqualTo("maria@mail.com");
        });
    }

    @Test
    void listar_sinFiltros_tambienFunciona() {
        when(personaRepository.findAll(any(Specification.class), any(Sort.class))).thenReturn(List.of());

        assertThat(service.listar(admin, null, "  ", false, false)).isEmpty();
    }

    @Test
    void listar_comoSocio_esRechazadoEnElServicio() {
        assertThatThrownBy(() -> service.listar(socio, null, null, false, false)).isInstanceOf(AccesoDenegadoException.class);
        verifyNoInteractions(personaRepository);
    }

    // ------------------------------------------------------------------ RF-43: cuota, servicios, conDeuda

    private Persona socioGym(long id, String dni) {
        Usuario u = usuario(100L + id, "gym" + id + "@mail.com", RolUsuario.SOCIO_PACIENTE);
        Persona p = persona(id, u);
        p.setDni(dni);
        p.definirMembresiaGym(true, LocalDate.of(2026, 1, 1));
        return p;
    }

    @Test
    void pi132_listar_incluyeLaCuotaDeMorosidadServiceYSoloLaDeSociosGym() {
        Persona conDeuda = socioGym(11L, "1");
        Persona suspendida = socioGym(12L, "2");
        Persona conExcepcion = socioGym(13L, "3");
        Persona soloConsultorio = persona(14L, usuario(114L, "c@mail.com", RolUsuario.SOCIO_PACIENTE));
        when(personaRepository.findAll(any(Specification.class), any(Sort.class)))
                .thenReturn(List.of(conDeuda, suspendida, conExcepcion, soloConsultorio));
        ExcepcionMorosidad exc = new ExcepcionMorosidad(13L, 1L, "plan", LocalDate.of(2026, 11, 15), false);
        when(morosidadService.veredictos(any())).thenReturn(Map.of(
                11L, new VeredictoMorosidad(new EstadoDeuda(1, 6, false), Optional.empty()),
                12L, new VeredictoMorosidad(new EstadoDeuda(6, 6, true), Optional.empty()),
                13L, new VeredictoMorosidad(new EstadoDeuda(6, 6, true), Optional.of(exc)),
                14L, new VeredictoMorosidad(EstadoDeuda.SIN_MEMBRESIA, Optional.empty())));

        List<PersonaResponse> r = service.listar(admin, null, null, false, false);

        assertThat(r.get(0).cuota()).isEqualTo(new PersonaResponse.CuotaInfo(1, 6, false, null));
        assertThat(r.get(1).cuota().suspendido()).isTrue();
        assertThat(r.get(2).cuota()).isEqualTo(new PersonaResponse.CuotaInfo(6, 6, false, LocalDate.of(2026, 11, 15)));
        assertThat(r.get(3).cuota()).isNull();
        assertThat(r).allSatisfy(x -> assertThat(x.tieneUsuarioSocio()).isTrue());
        verify(morosidadService).veredictos(any());
    }

    @Test
    void pi133_conDeuda_listaSoloALosQueTienenAlMenosUnPeriodoImpago() {
        Persona alDia = socioGym(11L, "1");
        Persona conDeuda = socioGym(12L, "2");
        Persona sinMembresia = persona(13L, usuario(113L, "c@mail.com", RolUsuario.SOCIO_PACIENTE));
        when(personaRepository.findAll(any(Specification.class), any(Sort.class)))
                .thenReturn(List.of(alDia, conDeuda, sinMembresia));
        when(morosidadService.veredictos(any())).thenReturn(Map.of(
                11L, new VeredictoMorosidad(new EstadoDeuda(0, 6, false), Optional.empty()),
                12L, new VeredictoMorosidad(new EstadoDeuda(1, 6, false), Optional.empty()),
                13L, new VeredictoMorosidad(EstadoDeuda.SIN_MEMBRESIA, Optional.empty())));

        assertThat(service.listar(admin, null, null, false, true)).extracting(PersonaResponse::id).containsExactly(12L);
    }

    @Test
    void listar_especialidadesAtendidasEnUnaSolaConsulta() {
        Persona a = socioGym(11L, "1");
        Persona b = socioGym(12L, "2");
        when(personaRepository.findAll(any(Specification.class), any(Sort.class))).thenReturn(List.of(a, b));
        when(morosidadService.veredictos(any())).thenReturn(Map.of());
        when(personaRepository.especialidadesAtendidas(any()))
                .thenReturn(List.of(new Object[] {11L, "KINESIOLOGIA"}, new Object[] {11L, "NUTRICION"}));

        List<PersonaResponse> r = service.listar(admin, null, null, false, false);

        assertThat(r.get(0).especialidades()).containsExactly(Especialidad.KINESIOLOGIA, Especialidad.NUTRICION);
        assertThat(r.get(1).especialidades()).isEmpty();
        verify(personaRepository).especialidadesAtendidas(List.of(11L, 12L));
    }

    @Test
    void tieneUsuarioSocio_falsoSiElUsuarioNoEsSocioODeshabilitado() {
        Usuario deshabilitado = usuario(5L, "off@mail.com", RolUsuario.SOCIO_PACIENTE);
        deshabilitado.setActivo(false);
        assertThat(PersonaResponse.de(persona(20L, deshabilitado)).tieneUsuarioSocio()).isFalse();
        assertThat(PersonaResponse.de(persona(21L, admin)).tieneUsuarioSocio()).isFalse();
        assertThat(PersonaResponse.de(persona(22L, socio)).tieneUsuarioSocio()).isTrue();
    }

    @Test
    void obtener_propiaFicha_estaPermitido() {
        when(personaRepository.findById(10L)).thenReturn(Optional.of(persona(10L, socio)));

        assertThat(service.obtener(socio, 10L).id()).isEqualTo(10L);
    }

    @Test
    void obtener_fichaAjena_comoSocio_esRechazado() {
        Usuario otro = usuario(3L, "otro@mail.com", RolUsuario.SOCIO_PACIENTE);
        when(personaRepository.findById(10L)).thenReturn(Optional.of(persona(10L, otro)));

        assertThatThrownBy(() -> service.obtener(socio, 10L)).isInstanceOf(AccesoDenegadoException.class);
    }

    @Test
    void obtener_comoAdmin_cualquierFicha() {
        when(personaRepository.findById(10L)).thenReturn(Optional.of(persona(10L, socio)));

        assertThat(service.obtener(admin, 10L).nombre()).isEqualTo("María");
    }

    @Test
    void obtener_inexistente_lanza404() {
        when(personaRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.obtener(admin, 99L)).isInstanceOf(RecursoNoEncontradoException.class);
    }

    @Test
    void crear_altaPresencial_creaUsuarioSocioYPersonaActiva() {
        when(personaRepository.existsByDni("40000001")).thenReturn(false);
        when(usuarioRepository.findByEmail("ana@mail.com")).thenReturn(Optional.empty());
        when(passwordEncoder.encode("Clave1234")).thenReturn("bcrypt");
        when(usuarioRepository.save(any(Usuario.class))).thenAnswer(inv -> {
            Usuario u = inv.getArgument(0);
            u.setId(50L);
            return u;
        });

        PersonaResponse r = service.crear(
                admin,
                new PersonaAltaRequest("ana@mail.com", "Clave1234", datos("40000001", true, LocalDate.of(2026, 10, 1))));

        assertThat(r.usuarioId()).isEqualTo(50L);
        assertThat(r.nombre()).isEqualTo("Ana");
        assertThat(r.apellido()).isEqualTo("López");
        assertThat(r.estado()).isEqualTo(EstadoPersona.ACTIVO);
        assertThat(r.fechaAlta()).isEqualTo(HOY);
        assertThat(r.fechaInicioMembresia()).isEqualTo(LocalDate.of(2026, 10, 1));
        verify(usuarioRepository).save(org.mockito.ArgumentMatchers.argThat(u -> u.getRol() == RolUsuario.SOCIO_PACIENTE
                && "bcrypt".equals(u.getPasswordHash())));
    }

    @Test
    void crear_noSocioGym_descartaFechaDeMembresia() {
        when(usuarioRepository.findByEmail(any())).thenReturn(Optional.empty());
        when(usuarioRepository.save(any(Usuario.class))).thenAnswer(inv -> inv.getArgument(0));

        PersonaResponse r = service.crear(
                admin, new PersonaAltaRequest("c@mail.com", "Clave1234", datos("40000002", false, LocalDate.of(2026, 1, 1))));

        assertThat(r.esSocioGym()).isFalse();
        assertThat(r.fechaInicioMembresia()).isNull();
    }

    @Test
    void crear_socioGymSinFechaDeMembresia_lanza400() {
        assertThatThrownBy(() -> service.crear(
                        admin, new PersonaAltaRequest("x@mail.com", "Clave1234", datos("40000003", true, null))))
                .isInstanceOf(DatosInvalidosException.class);
        verify(usuarioRepository, never()).save(any());
    }

    @Test
    void crear_dniRepetido_lanza409SinCrearUsuario() {
        when(personaRepository.existsByDni("38100001")).thenReturn(true);

        assertThatThrownBy(() -> service.crear(
                        admin, new PersonaAltaRequest("x@mail.com", "Clave1234", datos("38100001", false, null))))
                .isInstanceOf(ConflictoException.class);
        verify(usuarioRepository, never()).save(any());
    }

    @Test
    void crear_emailRepetido_lanza409() {
        when(usuarioRepository.findByEmail("maria@mail.com")).thenReturn(Optional.of(socio));

        assertThatThrownBy(() -> service.crear(
                        admin, new PersonaAltaRequest("maria@mail.com", "Clave1234", datos("40000004", false, null))))
                .isInstanceOf(EmailDuplicadoException.class);
    }

    @Test
    void crear_comoSocio_esRechazado() {
        assertThatThrownBy(() -> service.crear(
                        socio, new PersonaAltaRequest("x@mail.com", "Clave1234", datos("40000005", false, null))))
                .isInstanceOf(AccesoDenegadoException.class);
    }

    @Test
    void crear_carreraContraLaBase_traduceElUniqueA409() {
        when(usuarioRepository.findByEmail(any())).thenReturn(Optional.empty());
        when(usuarioRepository.save(any(Usuario.class))).thenAnswer(inv -> inv.getArgument(0));
        when(personaRepository.saveAndFlush(any(Persona.class))).thenThrow(new DataIntegrityViolationException("dni"));

        assertThatThrownBy(() -> service.crear(
                        admin, new PersonaAltaRequest("x@mail.com", "Clave1234", datos("40000006", false, null))))
                .isInstanceOf(ConflictoException.class);
    }

    @Test
    void actualizar_cambiaDatosYConservaElEstado() {
        when(personaRepository.findById(10L)).thenReturn(Optional.of(persona(10L, socio)));

        PersonaResponse r = service.actualizar(admin, 10L, datos("38100099", true, LocalDate.of(2026, 7, 1)));

        assertThat(r.dni()).isEqualTo("38100099");
        assertThat(r.esSocioGym()).isTrue();
        assertThat(r.estado()).isEqualTo(EstadoPersona.ACTIVO);
    }

    @Test
    void actualizar_dniDeOtraPersona_lanza409() {
        when(personaRepository.findById(10L)).thenReturn(Optional.of(persona(10L, socio)));
        when(personaRepository.existsByDniAndIdNot("38100002", 10L)).thenReturn(true);

        assertThatThrownBy(() -> service.actualizar(admin, 10L, datos("38100002", false, null)))
                .isInstanceOf(ConflictoException.class);
    }

    @Test
    void actualizar_comoSocio_esRechazado() {
        assertThatThrownBy(() -> service.actualizar(socio, 10L, datos("1234567", false, null)))
                .isInstanceOf(AccesoDenegadoException.class);
    }

    @Test
    void baja_marcaInactivoConFechaDeHoy() {
        when(personaRepository.findById(10L)).thenReturn(Optional.of(persona(10L, socio)));

        PersonaResponse r = service.darDeBaja(admin, 10L);

        assertThat(r.estado()).isEqualTo(EstadoPersona.INACTIVO);
        assertThat(r.fechaBaja()).isEqualTo(HOY);
    }

    @Test
    void baja_dosVeces_lanza409() {
        Persona p = persona(10L, socio);
        p.darDeBaja(HOY);
        when(personaRepository.findById(10L)).thenReturn(Optional.of(p));

        assertThatThrownBy(() -> service.darDeBaja(admin, 10L)).isInstanceOf(ConflictoException.class);
    }

    @Test
    void baja_comoSocio_esRechazado() {
        assertThatThrownBy(() -> service.darDeBaja(socio, 10L)).isInstanceOf(AccesoDenegadoException.class);
    }

    @Test
    void reactivar_limpiaLaFechaDeBaja() {
        Persona p = persona(10L, socio);
        p.darDeBaja(HOY);
        when(personaRepository.findById(10L)).thenReturn(Optional.of(p));

        PersonaResponse r = service.reactivar(admin, 10L);

        assertThat(r.estado()).isEqualTo(EstadoPersona.ACTIVO);
        assertThat(r.fechaBaja()).isNull();
    }

    @Test
    void reactivar_personaActiva_lanza409() {
        when(personaRepository.findById(10L)).thenReturn(Optional.of(persona(10L, socio)));

        assertThatThrownBy(() -> service.reactivar(admin, 10L)).isInstanceOf(ConflictoException.class);
    }

    @Test
    void reactivar_comoSocio_esRechazado() {
        assertThatThrownBy(() -> service.reactivar(socio, 10L)).isInstanceOf(AccesoDenegadoException.class);
    }

    // ------------------------------------------------------------------ vínculo (RF-31)

    private PersonaVinculoRequest vinculo(String email) {
        return new PersonaVinculoRequest(email, datos("40000010", false, null), null);
    }

    @Test
    void vincular_creaLaFichaConElUsuarioExistenteSinCrearOtro() {
        when(usuarioRepository.findByEmail("maria@mail.com")).thenReturn(Optional.of(socio));
        when(personaRepository.findByUsuarioId(2L)).thenReturn(Optional.empty());

        PersonaResponse r = service.vincular(admin, vinculo(" maria@mail.com "));

        assertThat(r.usuarioId()).isEqualTo(2L);
        assertThat(r.estado()).isEqualTo(EstadoPersona.ACTIVO);
        assertThat(r.fechaAlta()).isEqualTo(HOY);
        verify(usuarioRepository, never()).save(any());
    }

    @Test
    void vincular_comoSocio_403SinBuscarElEmail() {
        assertThatThrownBy(() -> service.vincular(socio, vinculo("nadie@mail.com")))
                .isInstanceOf(AccesoDenegadoException.class);
        verifyNoInteractions(usuarioRepository);
    }

    @Test
    void vincular_emailInexistente_404() {
        when(usuarioRepository.findByEmail("nadie@mail.com")).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.vincular(admin, vinculo("nadie@mail.com")))
                .isInstanceOf(RecursoNoEncontradoException.class);
    }

    @Test
    void vincular_usuarioYaVinculado_409() {
        when(usuarioRepository.findByEmail("maria@mail.com")).thenReturn(Optional.of(socio));
        when(personaRepository.findByUsuarioId(2L)).thenReturn(Optional.of(persona(10L, socio)));
        assertThatThrownBy(() -> service.vincular(admin, vinculo("maria@mail.com")))
                .isInstanceOf(ConflictoException.class)
                .hasMessageContaining("ya está vinculado");
    }

    @Test
    void vincular_usuarioQueNoEsSocioPaciente_422() {
        when(usuarioRepository.findByEmail("admin@vitalys.com")).thenReturn(Optional.of(admin));
        when(personaRepository.findByUsuarioId(1L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.vincular(admin, vinculo("admin@vitalys.com")))
                .isInstanceOf(ReglaDeNegocioException.class);
    }

    @Test
    void vincular_dniRepetido_409() {
        when(usuarioRepository.findByEmail("maria@mail.com")).thenReturn(Optional.of(socio));
        when(personaRepository.findByUsuarioId(2L)).thenReturn(Optional.empty());
        when(personaRepository.existsByDni("40000010")).thenReturn(true);
        assertThatThrownBy(() -> service.vincular(admin, vinculo("maria@mail.com")))
                .isInstanceOf(ConflictoException.class)
                .hasMessageContaining("DNI");
    }

    @Test
    void vincular_conContrasena_400() {
        PersonaVinculoRequest conClave = new PersonaVinculoRequest("maria@mail.com", datos("40000010", false, null), "x");
        assertThatThrownBy(() -> service.vincular(admin, conClave)).isInstanceOf(DatosInvalidosException.class);
    }

    @Test
    void vincular_socioGymSinFecha_400() {
        when(usuarioRepository.findByEmail("maria@mail.com")).thenReturn(Optional.of(socio));
        when(personaRepository.findByUsuarioId(2L)).thenReturn(Optional.empty());
        PersonaVinculoRequest req = new PersonaVinculoRequest("maria@mail.com", datos("40000010", true, null), null);
        assertThatThrownBy(() -> service.vincular(admin, req)).isInstanceOf(DatosInvalidosException.class);
    }
}
