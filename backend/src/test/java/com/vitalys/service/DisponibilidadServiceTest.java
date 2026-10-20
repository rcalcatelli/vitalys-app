package com.vitalys.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.vitalys.domain.DisponibilidadProfesional;
import com.vitalys.domain.Especialidad;
import com.vitalys.domain.Profesional;
import com.vitalys.domain.RolUsuario;
import com.vitalys.domain.Usuario;
import com.vitalys.dto.FranjaRequest;
import com.vitalys.dto.FranjaResponse;
import com.vitalys.dto.ImpactoResponse;
import com.vitalys.exception.AccesoDenegadoException;
import com.vitalys.exception.ConfirmacionRequeridaException;
import com.vitalys.exception.ConflictoException;
import com.vitalys.exception.DatosInvalidosException;
import com.vitalys.exception.RecursoNoEncontradoException;
import com.vitalys.repository.DisponibilidadProfesionalRepository;
import com.vitalys.repository.ProfesionalRepository;
import java.sql.SQLException;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InOrder;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.InvalidDataAccessApiUsageException;

class DisponibilidadServiceTest {

    private ProfesionalRepository profesionalRepository;
    private DisponibilidadProfesionalRepository disponibilidadRepository;
    private CascadaDisponibilidadService cascada;
    private DisponibilidadService service;

    private final Usuario admin = usuario(1L, RolUsuario.ADMIN);
    private final Usuario usuarioDueno = usuario(2L, RolUsuario.PROFESIONAL);
    private final Usuario usuarioOtro = usuario(3L, RolUsuario.PROFESIONAL);
    private final Usuario socio = usuario(4L, RolUsuario.SOCIO_PACIENTE);
    private Profesional profesional;

    @BeforeEach
    void setUp() {
        profesionalRepository = mock(ProfesionalRepository.class);
        disponibilidadRepository = mock(DisponibilidadProfesionalRepository.class);
        cascada = mock(CascadaDisponibilidadService.class);
        service = new DisponibilidadService(profesionalRepository, disponibilidadRepository, cascada);

        profesional = new Profesional(usuarioDueno);
        profesional.setId(10L);
        profesional.setNombre("Valentina");
        profesional.setApellido("Méndez");
        profesional.setEspecialidad(Especialidad.NUTRICION);
        profesional.setDuracionTurnoMinutos(30);
        when(profesionalRepository.buscarParaActualizar(10L)).thenReturn(Optional.of(profesional));
        when(disponibilidadRepository.saveAndFlush(any(DisponibilidadProfesional.class)))
                .thenAnswer(inv -> inv.getArgument(0));
    }

    private static Usuario usuario(Long id, RolUsuario rol) {
        Usuario u = new Usuario("u" + id + "@vitalys.com", "hash", rol);
        u.setId(id);
        return u;
    }

    private static FranjaRequest franja(int dia, String desde, String hasta) {
        return new FranjaRequest(dia, LocalTime.parse(desde), LocalTime.parse(hasta));
    }

    private DisponibilidadProfesional existente(Long id, int dia, String desde, String hasta) {
        DisponibilidadProfesional d =
                new DisponibilidadProfesional(profesional, dia, LocalTime.parse(desde), LocalTime.parse(hasta));
        org.springframework.test.util.ReflectionTestUtils.setField(d, "id", id);
        return d;
    }

    private static DataIntegrityViolationException rechazoDeBase(String sqlState) {
        return new DataIntegrityViolationException("x", new SQLException("rechazo", sqlState));
    }

    // --- listar ---

    @Test
    void listar_devuelveLasFranjasOrdenadas() {
        when(profesionalRepository.existsById(10L)).thenReturn(true);
        when(disponibilidadRepository.findByProfesionalIdOrderByDiaSemanaAscHoraInicioAsc(10L))
                .thenReturn(List.of(existente(1L, 1, "09:00", "13:00")));

        assertThat(service.listar(10L)).singleElement().satisfies(f -> {
            assertThat(f.diaSemana()).isEqualTo(1);
            assertThat(f.horaFin()).isEqualTo(LocalTime.of(13, 0));
        });
    }

    @Test
    void listar_profesionalInexistente_lanza404() {
        when(profesionalRepository.existsById(99L)).thenReturn(false);

        assertThatThrownBy(() -> service.listar(99L)).isInstanceOf(RecursoNoEncontradoException.class);
    }

    // --- crear ---

    @Test
    void crear_comoDueno_guardaLaFranja() {
        FranjaResponse r = service.crear(usuarioDueno, 10L, franja(1, "09:00", "13:00"));

        assertThat(r.diaSemana()).isEqualTo(1);
        assertThat(r.horaInicio()).isEqualTo(LocalTime.of(9, 0));
        verify(disponibilidadRepository).saveAndFlush(any(DisponibilidadProfesional.class));
    }

    @Test
    void crear_comoAdmin_estaPermitido() {
        assertThat(service.crear(admin, 10L, franja(2, "14:00", "19:00")).diaSemana()).isEqualTo(2);
    }

    @Test
    void crear_comoOtroProfesional_oSocio_es403() {
        assertThatThrownBy(() -> service.crear(usuarioOtro, 10L, franja(1, "09:00", "13:00")))
                .isInstanceOf(AccesoDenegadoException.class);
        assertThatThrownBy(() -> service.crear(socio, 10L, franja(1, "09:00", "13:00")))
                .isInstanceOf(AccesoDenegadoException.class);
        verify(disponibilidadRepository, never()).saveAndFlush(any());
    }

    @Test
    void crear_profesionalInexistente_lanza404() {
        when(profesionalRepository.buscarParaActualizar(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.crear(admin, 99L, franja(1, "09:00", "13:00")))
                .isInstanceOf(RecursoNoEncontradoException.class);
    }

    @Test
    void crear_profesionalDeBaja_lanza409() {
        profesional.darDeBaja();

        assertThatThrownBy(() -> service.crear(admin, 10L, franja(1, "09:00", "13:00")))
                .isInstanceOf(ConflictoException.class);
    }

    @Test
    void crear_horaFinNoPosterior_lanzaDatosInvalidos() {
        assertThatThrownBy(() -> service.crear(admin, 10L, franja(1, "13:00", "13:00")))
                .isInstanceOf(DatosInvalidosException.class);
        assertThatThrownBy(() -> service.crear(admin, 10L, franja(1, "13:00", "09:00")))
                .isInstanceOf(DatosInvalidosException.class);
    }

    @Test
    void crear_solapamiento_seTraduceA409ConMensajeDeDisponibilidad() {
        when(disponibilidadRepository.saveAndFlush(any(DisponibilidadProfesional.class)))
                .thenThrow(rechazoDeBase("23P01"));

        assertThatThrownBy(() -> service.crear(admin, 10L, franja(2, "18:00", "20:00")))
                .isInstanceOf(ConflictoException.class)
                .hasMessageContaining("se superpone con otra del mismo día")
                .hasMessageContaining("contiguas");
    }

    @Test
    void crear_mismoDiaEInicio_seTraduceA409() {
        when(disponibilidadRepository.saveAndFlush(any(DisponibilidadProfesional.class)))
                .thenThrow(rechazoDeBase("23505"));

        assertThatThrownBy(() -> service.crear(admin, 10L, franja(2, "14:00", "15:00")))
                .isInstanceOf(ConflictoException.class)
                .hasMessageContaining("empieza a esa hora");
    }

    @Test
    void crear_checkDeHoras_seTraduceADatosInvalidos() {
        when(disponibilidadRepository.saveAndFlush(any(DisponibilidadProfesional.class)))
                .thenThrow(rechazoDeBase("23514"));

        assertThatThrownBy(() -> service.crear(admin, 10L, franja(2, "14:00", "15:00")))
                .isInstanceOf(DatosInvalidosException.class);
    }

    @Test
    void crear_errorDeBaseNoReconocido_sePropagaTalCual() {
        DataIntegrityViolationException otro = rechazoDeBase("23503");
        when(disponibilidadRepository.saveAndFlush(any(DisponibilidadProfesional.class))).thenThrow(otro);

        assertThatThrownBy(() -> service.crear(admin, 10L, franja(2, "14:00", "15:00"))).isSameAs(otro);
    }

    @Test
    void crear_errorSinSqlException_sePropagaTalCual() {
        InvalidDataAccessApiUsageException otro = new InvalidDataAccessApiUsageException("sin sql");
        when(disponibilidadRepository.saveAndFlush(any(DisponibilidadProfesional.class))).thenThrow(otro);

        assertThatThrownBy(() -> service.crear(admin, 10L, franja(2, "14:00", "15:00"))).isSameAs(otro);
    }

    // --- actualizar ---

    @Test
    void actualizar_modificaDiaYHoras() {
        DisponibilidadProfesional d = existente(5L, 1, "09:00", "13:00");
        when(disponibilidadRepository.findById(5L)).thenReturn(Optional.of(d));

        FranjaResponse r = service.actualizar(usuarioDueno, 10L, 5L, franja(3, "10:00", "12:00"), false);

        assertThat(r.diaSemana()).isEqualTo(3);
        assertThat(d.getHoraInicio()).isEqualTo(LocalTime.of(10, 0));
        assertThat(d.getHoraFin()).isEqualTo(LocalTime.of(12, 0));
    }

    @Test
    void actualizar_franjaDeOtroProfesional_lanza404() {
        Profesional otro = new Profesional(usuarioOtro);
        otro.setId(11L);
        DisponibilidadProfesional ajena =
                new DisponibilidadProfesional(otro, 1, LocalTime.of(9, 0), LocalTime.of(13, 0));
        when(disponibilidadRepository.findById(5L)).thenReturn(Optional.of(ajena));

        assertThatThrownBy(() -> service.actualizar(admin, 10L, 5L, franja(1, "09:00", "10:00"), false))
                .isInstanceOf(RecursoNoEncontradoException.class);
    }

    @Test
    void actualizar_franjaInexistente_lanza404() {
        when(disponibilidadRepository.findById(5L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.actualizar(admin, 10L, 5L, franja(1, "09:00", "10:00"), false))
                .isInstanceOf(RecursoNoEncontradoException.class);
    }

    @Test
    void actualizar_comoOtroProfesional_es403() {
        assertThatThrownBy(() -> service.actualizar(usuarioOtro, 10L, 5L, franja(1, "09:00", "10:00"), false))
                .isInstanceOf(AccesoDenegadoException.class);
    }

    // --- eliminar ---

    @Test
    void eliminar_borraFisicamenteYVuelcaALaBase() {
        DisponibilidadProfesional d = existente(5L, 1, "09:00", "13:00");
        when(disponibilidadRepository.findById(5L)).thenReturn(Optional.of(d));

        service.eliminar(usuarioDueno, 10L, 5L, false);

        verify(disponibilidadRepository).delete(d);
        verify(disponibilidadRepository).flush();
    }

    @Test
    void eliminar_comoSocio_es403() {
        assertThatThrownBy(() -> service.eliminar(socio, 10L, 5L, false)).isInstanceOf(AccesoDenegadoException.class);
        verify(disponibilidadRepository, never()).delete(any());
    }

    // --- reemplazar ---

    @Test
    void reemplazar_borraYVuelcaAntesDeInsertar() {
        List<DisponibilidadProfesional> actuales = List.of(existente(1L, 1, "09:00", "13:00"));
        when(disponibilidadRepository.findByProfesionalIdOrderByDiaSemanaAscHoraInicioAsc(10L))
                .thenReturn(actuales);

        List<FranjaResponse> r = service.reemplazar(
                usuarioDueno, 10L, List.of(franja(1, "09:00", "11:00"), franja(1, "11:00", "13:00")), false);

        InOrder orden = inOrder(disponibilidadRepository);
        orden.verify(disponibilidadRepository).deleteAll(actuales);
        orden.verify(disponibilidadRepository).flush();
        orden.verify(disponibilidadRepository, org.mockito.Mockito.times(2))
                .saveAndFlush(any(DisponibilidadProfesional.class));
        assertThat(r).isNotNull();
    }

    @Test
    void reemplazar_conListaVacia_dejaSinDisponibilidad() {
        service.reemplazar(admin, 10L, List.of(), false);

        verify(disponibilidadRepository, never()).saveAndFlush(any());
    }

    @Test
    void reemplazar_solapamientoEnElBatch_seTraduceA409() {
        when(disponibilidadRepository.saveAndFlush(any(DisponibilidadProfesional.class)))
                .thenAnswer(inv -> inv.getArgument(0))
                .thenThrow(rechazoDeBase("23P01"));

        assertThatThrownBy(() -> service.reemplazar(
                        admin, 10L, List.of(franja(2, "14:00", "19:00"), franja(2, "18:00", "20:00")), false))
                .isInstanceOf(ConflictoException.class)
                .hasMessageContaining("se superpone");
    }

    @Test
    void reemplazar_franjaConHorasInvalidas_noTocaLaBase() {
        assertThatThrownBy(() -> service.reemplazar(admin, 10L, List.of(franja(1, "13:00", "09:00")), false))
                .isInstanceOf(DatosInvalidosException.class);
        verify(disponibilidadRepository, never()).deleteAll(any(Iterable.class));
    }

    @Test
    void reemplazar_comoOtroProfesional_es403() {
        assertThatThrownBy(() -> service.reemplazar(usuarioOtro, 10L, List.of(), false))
                .isInstanceOf(AccesoDenegadoException.class);
    }

    // --- cascada (RN-24) ---

    @Test
    void reemplazar_resuelveLaCascadaAntesDeTocarLaBase() {
        List<FranjaRequest> nuevas = List.of(franja(1, "09:00", "11:00"));

        service.reemplazar(usuarioDueno, 10L, nuevas, true);

        InOrder orden = inOrder(cascada, disponibilidadRepository);
        orden.verify(cascada).resolver(eq(usuarioDueno), eq(profesional), eq(nuevas), eq(true), any());
        orden.verify(disponibilidadRepository).flush();
    }

    @Test
    void reemplazar_sinConfirmarConImpacto_cortaSinTocarLaBase() {
        List<FranjaRequest> nuevas = List.of(franja(1, "09:00", "11:00"));
        when(cascada.resolver(any(), any(), any(), eq(false), any()))
                .thenThrow(new ConfirmacionRequeridaException("hay impacto", ImpactoResponse.de(List.of())));

        assertThatThrownBy(() -> service.reemplazar(admin, 10L, nuevas, false))
                .isInstanceOf(ConfirmacionRequeridaException.class);

        verify(disponibilidadRepository, never()).deleteAll(any(Iterable.class));
        verify(disponibilidadRepository, never()).saveAndFlush(any());
    }

    @Test
    void actualizar_calculaElImpactoConLaFranjaYaModificada() {
        DisponibilidadProfesional editada = existente(5L, 1, "09:00", "13:00");
        DisponibilidadProfesional otra = existente(6L, 3, "09:00", "13:00");
        when(disponibilidadRepository.findById(5L)).thenReturn(Optional.of(editada));
        when(disponibilidadRepository.findByProfesionalIdOrderByDiaSemanaAscHoraInicioAsc(10L))
                .thenReturn(List.of(editada, otra));

        service.actualizar(admin, 10L, 5L, franja(1, "09:00", "11:00"), true);

        verify(cascada)
                .resolver(
                        eq(admin),
                        eq(profesional),
                        eq(List.of(franja(3, "09:00", "13:00"), franja(1, "09:00", "11:00"))),
                        eq(true),
                        any());
    }

    @Test
    void eliminar_calculaElImpactoSinLaFranjaQuitada() {
        DisponibilidadProfesional quitada = existente(5L, 1, "09:00", "13:00");
        DisponibilidadProfesional queda = existente(6L, 3, "09:00", "13:00");
        when(disponibilidadRepository.findById(5L)).thenReturn(Optional.of(quitada));
        when(disponibilidadRepository.findByProfesionalIdOrderByDiaSemanaAscHoraInicioAsc(10L))
                .thenReturn(List.of(quitada, queda));

        service.eliminar(admin, 10L, 5L, true);

        verify(cascada)
                .resolver(eq(admin), eq(profesional), eq(List.of(franja(3, "09:00", "13:00"))), eq(true), any());
        verify(disponibilidadRepository).delete(quitada);
    }

    @Test
    void impacto_esSoloLectura_yNoTomaElLock() {
        when(profesionalRepository.findById(10L)).thenReturn(Optional.of(profesional));
        ImpactoResponse esperado = ImpactoResponse.de(List.of());
        when(cascada.impacto(eq(10L), any())).thenReturn(esperado);

        assertThat(service.impacto(usuarioDueno, 10L, List.of(franja(1, "09:00", "10:00"))))
                .isSameAs(esperado);

        verify(profesionalRepository, never()).buscarParaActualizar(any());
        verify(cascada, never()).resolver(any(), any(), any(), anyBoolean(), any());
    }

    @Test
    void impacto_comoOtroProfesional_es403_yConHorasInvertidas_400() {
        when(profesionalRepository.findById(10L)).thenReturn(Optional.of(profesional));

        assertThatThrownBy(() -> service.impacto(usuarioOtro, 10L, List.of()))
                .isInstanceOf(AccesoDenegadoException.class);
        assertThatThrownBy(() -> service.impacto(admin, 10L, List.of(franja(1, "13:00", "09:00"))))
                .isInstanceOf(DatosInvalidosException.class);
    }

    @Test
    void impacto_profesionalInexistente_lanza404() {
        when(profesionalRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.impacto(admin, 99L, List.of()))
                .isInstanceOf(RecursoNoEncontradoException.class);
    }

    @Test
    void impactoDeQuitar_consultaConLasFranjasRestantes() {
        DisponibilidadProfesional quitada = existente(5L, 1, "09:00", "13:00");
        when(profesionalRepository.findById(10L)).thenReturn(Optional.of(profesional));
        when(disponibilidadRepository.findById(5L)).thenReturn(Optional.of(quitada));
        when(disponibilidadRepository.findByProfesionalIdOrderByDiaSemanaAscHoraInicioAsc(10L))
                .thenReturn(List.of(quitada));

        service.impactoDeQuitar(usuarioDueno, 10L, 5L);

        verify(cascada).impacto(10L, List.of());
    }

    @Test
    void impactoDeQuitar_profesionalDeBaja_lanza409() {
        profesional.darDeBaja();
        when(profesionalRepository.findById(10L)).thenReturn(Optional.of(profesional));

        assertThatThrownBy(() -> service.impactoDeQuitar(admin, 10L, 5L)).isInstanceOf(ConflictoException.class);
    }
}
