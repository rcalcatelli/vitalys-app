package com.vitalys.service;

import com.vitalys.domain.DisponibilidadProfesional;
import com.vitalys.domain.Profesional;
import com.vitalys.domain.RolUsuario;
import com.vitalys.domain.Usuario;
import com.vitalys.dto.FranjaRequest;
import com.vitalys.dto.FranjaResponse;
import com.vitalys.exception.AccesoDenegadoException;
import com.vitalys.exception.ConflictoException;
import com.vitalys.exception.DatosInvalidosException;
import com.vitalys.exception.RecursoNoEncontradoException;
import com.vitalys.repository.DisponibilidadProfesionalRepository;
import com.vitalys.repository.ProfesionalRepository;
import java.sql.SQLException;
import java.util.List;
import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Franjas semanales de los profesionales (RF-14). La regla de no solapamiento (RN-11) la
 * garantiza la base ({@code trg_disponibilidad_overlap}, V13); el servicio no la repite, solo
 * traduce el rechazo a 409. Toda escritura toma un lock sobre la fila del profesional, así dos
 * pedidos simultáneos sobre el mismo profesional se serializan. Quitar una franja es borrado
 * físico: {@code uq_disp} no es parcial, una franja desactivada seguiría chocando por inicio.
 */
@Service
public class DisponibilidadService {

    private static final String CHECK = "23514";
    private static final String EXCLUSION = "23P01";
    private static final String UNICO = "23505";

    private final ProfesionalRepository profesionalRepository;
    private final DisponibilidadProfesionalRepository disponibilidadRepository;

    public DisponibilidadService(
            ProfesionalRepository profesionalRepository, DisponibilidadProfesionalRepository disponibilidadRepository) {
        this.profesionalRepository = profesionalRepository;
        this.disponibilidadRepository = disponibilidadRepository;
    }

    /** Cualquier usuario autenticado puede ver las franjas: el paciente las necesita para reservar. */
    @Transactional(readOnly = true)
    public List<FranjaResponse> listar(Long profesionalId) {
        if (!profesionalRepository.existsById(profesionalId)) {
            throw noExiste(profesionalId);
        }
        return franjasDe(profesionalId);
    }

    @Transactional
    public FranjaResponse crear(Usuario actor, Long profesionalId, FranjaRequest request) {
        Profesional profesional = profesionalParaEscribir(actor, profesionalId);
        validarHoras(request);
        DisponibilidadProfesional franja = new DisponibilidadProfesional(
                profesional, request.diaSemana(), request.horaInicio(), request.horaFin());
        return FranjaResponse.de(guardar(franja));
    }

    @Transactional
    public FranjaResponse actualizar(Usuario actor, Long profesionalId, Long franjaId, FranjaRequest request) {
        profesionalParaEscribir(actor, profesionalId);
        validarHoras(request);
        DisponibilidadProfesional franja = buscarFranja(profesionalId, franjaId);
        franja.setDiaSemana(request.diaSemana());
        franja.setHoraInicio(request.horaInicio());
        franja.setHoraFin(request.horaFin());
        return FranjaResponse.de(guardar(franja));
    }

    @Transactional
    public void eliminar(Usuario actor, Long profesionalId, Long franjaId) {
        profesionalParaEscribir(actor, profesionalId);
        disponibilidadRepository.delete(buscarFranja(profesionalId, franjaId));
        disponibilidadRepository.flush();
    }

    /**
     * Reemplazo total. El borrado se vuelca a la base ANTES de insertar: Hibernate ejecuta los
     * INSERT antes que los DELETE dentro de un mismo flush, y las franjas nuevas que reutilizan
     * día e inicio chocarían con {@code uq_disp} o con el trigger de solapamiento. Si cualquier
     * franja se rechaza, la transacción entera se revierte y no queda nada a medias.
     */
    @Transactional
    public List<FranjaResponse> reemplazar(Usuario actor, Long profesionalId, List<FranjaRequest> franjas) {
        Profesional profesional = profesionalParaEscribir(actor, profesionalId);
        franjas.forEach(DisponibilidadService::validarHoras);

        disponibilidadRepository.deleteAll(
                disponibilidadRepository.findByProfesionalIdOrderByDiaSemanaAscHoraInicioAsc(profesionalId));
        disponibilidadRepository.flush();

        try {
            for (FranjaRequest f : franjas) {
                disponibilidadRepository.saveAndFlush(
                        new DisponibilidadProfesional(profesional, f.diaSemana(), f.horaInicio(), f.horaFin()));
            }
        } catch (DataAccessException ex) {
            throw traducir(ex);
        }
        return franjasDe(profesionalId);
    }

    private List<FranjaResponse> franjasDe(Long profesionalId) {
        return disponibilidadRepository.findByProfesionalIdOrderByDiaSemanaAscHoraInicioAsc(profesionalId).stream()
                .map(FranjaResponse::de)
                .toList();
    }

    /** ADMIN o el PROFESIONAL dueño (RNF-03); devuelve al profesional con su fila bloqueada. */
    private Profesional profesionalParaEscribir(Usuario actor, Long profesionalId) {
        Profesional profesional = profesionalRepository
                .buscarParaActualizar(profesionalId)
                .orElseThrow(() -> noExiste(profesionalId));
        boolean esAdmin = actor.getRol() == RolUsuario.ADMIN;
        boolean esDueno = actor.getRol() == RolUsuario.PROFESIONAL
                && profesional.getUsuario().getId().equals(actor.getId());
        if (!esAdmin && !esDueno) {
            throw new AccesoDenegadoException("Solo el ADMIN o el propio profesional pueden modificar su disponibilidad");
        }
        if (!profesional.isActivo()) {
            throw new ConflictoException("El profesional está dado de baja: no se puede modificar su disponibilidad");
        }
        return profesional;
    }

    private DisponibilidadProfesional buscarFranja(Long profesionalId, Long franjaId) {
        return disponibilidadRepository
                .findById(franjaId)
                .filter(f -> f.getProfesional().getId().equals(profesionalId))
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "No existe la franja " + franjaId + " del profesional " + profesionalId));
    }

    private static void validarHoras(FranjaRequest request) {
        if (!request.horaFin().isAfter(request.horaInicio())) {
            throw new DatosInvalidosException("La hora de fin debe ser posterior a la hora de inicio");
        }
    }

    private DisponibilidadProfesional guardar(DisponibilidadProfesional franja) {
        try {
            return disponibilidadRepository.saveAndFlush(franja);
        } catch (DataAccessException ex) {
            throw traducir(ex);
        }
    }

    private static RecursoNoEncontradoException noExiste(Long profesionalId) {
        return new RecursoNoEncontradoException("No existe el profesional " + profesionalId);
    }

    /**
     * Traducción local de los rechazos del motor, con mensajes propios de la disponibilidad (no
     * se reusa {@link ErroresDeBase}, cuyos textos son de turnos). El trigger de solapamiento usa
     * 23P01; {@code uq_disp} (mismo día e inicio) es 23505 y {@code chk_horas} es 23514.
     */
    private static RuntimeException traducir(DataAccessException ex) {
        for (Throwable t = ex; t != null; t = t.getCause()) {
            if (t instanceof SQLException sql) {
                String estado = sql.getSQLState();
                if (EXCLUSION.equals(estado)) {
                    return new ConflictoException(
                            "La franja se superpone con otra del mismo día: ajustá los horarios (las franjas "
                                    + "contiguas, donde una termina cuando empieza la otra, sí están permitidas)");
                }
                if (UNICO.equals(estado)) {
                    return new ConflictoException("Ya existe una franja que empieza a esa hora ese día");
                }
                if (CHECK.equals(estado)) {
                    return new DatosInvalidosException("La hora de fin debe ser posterior a la hora de inicio");
                }
            }
        }
        return ex;
    }
}
