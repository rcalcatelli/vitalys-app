package com.vitalys.service;

import com.vitalys.domain.DisponibilidadProfesional;
import com.vitalys.domain.Profesional;
import com.vitalys.domain.RolUsuario;
import com.vitalys.domain.Usuario;
import com.vitalys.dto.FranjaRequest;
import com.vitalys.dto.FranjaResponse;
import com.vitalys.dto.ImpactoResponse;
import com.vitalys.exception.AccesoDenegadoException;
import com.vitalys.exception.ConflictoException;
import com.vitalys.exception.DatosInvalidosException;
import com.vitalys.exception.RecursoNoEncontradoException;
import com.vitalys.repository.DisponibilidadProfesionalRepository;
import com.vitalys.repository.ProfesionalRepository;
import java.sql.SQLException;
import java.util.ArrayList;
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
 *
 * <p>Reducir la cobertura cancela los turnos futuros que quedan afuera (RN-24): lo resuelve
 * {@link CascadaDisponibilidadService} dentro de la misma transacción. Sin {@code confirmar=true}
 * y con turnos afectados, el cambio se rechaza con 409 y la lista de impacto; agregar una franja
 * nunca reduce la cobertura, así que no pide confirmación.
 */
@Service
public class DisponibilidadService {

    private static final String CHECK = "23514";
    private static final String EXCLUSION = "23P01";
    private static final String UNICO = "23505";
    private static final String MOTIVO_CASCADA = "El profesional modificó su disponibilidad";

    private final ProfesionalRepository profesionalRepository;
    private final DisponibilidadProfesionalRepository disponibilidadRepository;
    private final CascadaDisponibilidadService cascada;

    public DisponibilidadService(
            ProfesionalRepository profesionalRepository,
            DisponibilidadProfesionalRepository disponibilidadRepository,
            CascadaDisponibilidadService cascada) {
        this.profesionalRepository = profesionalRepository;
        this.disponibilidadRepository = disponibilidadRepository;
        this.cascada = cascada;
    }

    /** Vista previa de RN-24 para un conjunto completo de franjas (borrador). No modifica nada. */
    @Transactional(readOnly = true)
    public ImpactoResponse impacto(Usuario actor, Long profesionalId, List<FranjaRequest> borrador) {
        autorizarLectura(actor, profesionalId);
        borrador.forEach(DisponibilidadService::validarHoras);
        return cascada.impacto(profesionalId, borrador);
    }

    /** Vista previa de quitar una franja entera ({@code GET .../{dId}/impacto}). */
    @Transactional(readOnly = true)
    public ImpactoResponse impactoDeQuitar(Usuario actor, Long profesionalId, Long franjaId) {
        autorizarLectura(actor, profesionalId);
        DisponibilidadProfesional franja = buscarFranja(profesionalId, franjaId);
        return cascada.impacto(profesionalId, sinFranja(profesionalId, franja));
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
    public FranjaResponse actualizar(
            Usuario actor, Long profesionalId, Long franjaId, FranjaRequest request, boolean confirmar) {
        Profesional profesional = profesionalParaEscribir(actor, profesionalId);
        validarHoras(request);
        DisponibilidadProfesional franja = buscarFranja(profesionalId, franjaId);
        List<FranjaRequest> nuevas = sinFranja(profesionalId, franja);
        nuevas.add(request);
        cascada.resolver(actor, profesional, nuevas, confirmar, MOTIVO_CASCADA);
        franja.setDiaSemana(request.diaSemana());
        franja.setHoraInicio(request.horaInicio());
        franja.setHoraFin(request.horaFin());
        return FranjaResponse.de(guardar(franja));
    }

    @Transactional
    public void eliminar(Usuario actor, Long profesionalId, Long franjaId, boolean confirmar) {
        Profesional profesional = profesionalParaEscribir(actor, profesionalId);
        DisponibilidadProfesional franja = buscarFranja(profesionalId, franjaId);
        cascada.resolver(actor, profesional, sinFranja(profesionalId, franja), confirmar, MOTIVO_CASCADA);
        disponibilidadRepository.delete(franja);
        disponibilidadRepository.flush();
    }

    /**
     * Reemplazo total. El borrado se vuelca a la base ANTES de insertar: Hibernate ejecuta los
     * INSERT antes que los DELETE dentro de un mismo flush, y las franjas nuevas que reutilizan
     * día e inicio chocarían con {@code uq_disp} o con el trigger de solapamiento. Si cualquier
     * franja se rechaza, la transacción entera se revierte y no queda nada a medias.
     */
    @Transactional
    public List<FranjaResponse> reemplazar(
            Usuario actor, Long profesionalId, List<FranjaRequest> franjas, boolean confirmar) {
        Profesional profesional = profesionalParaEscribir(actor, profesionalId);
        franjas.forEach(DisponibilidadService::validarHoras);
        cascada.resolver(actor, profesional, franjas, confirmar, MOTIVO_CASCADA);

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
        autorizar(actor, profesional);
        return profesional;
    }

    /** Mismas reglas que escribir, sin lock: para las vistas previas de impacto. */
    private void autorizarLectura(Usuario actor, Long profesionalId) {
        autorizar(
                actor,
                profesionalRepository.findById(profesionalId).orElseThrow(() -> noExiste(profesionalId)));
    }

    /** Franjas actuales como borrador, sin la indicada (copia modificable). */
    private List<FranjaRequest> sinFranja(Long profesionalId, DisponibilidadProfesional quitar) {
        List<FranjaRequest> resto = new ArrayList<>();
        for (DisponibilidadProfesional d :
                disponibilidadRepository.findByProfesionalIdOrderByDiaSemanaAscHoraInicioAsc(profesionalId)) {
            if (!d.getId().equals(quitar.getId())) {
                resto.add(new FranjaRequest(d.getDiaSemana(), d.getHoraInicio(), d.getHoraFin()));
            }
        }
        return resto;
    }

    private static void autorizar(Usuario actor, Profesional profesional) {
        boolean esAdmin = actor.getRol() == RolUsuario.ADMIN;
        boolean esDueno = actor.getRol() == RolUsuario.PROFESIONAL
                && profesional.getUsuario().getId().equals(actor.getId());
        if (!esAdmin && !esDueno) {
            throw new AccesoDenegadoException("Solo el ADMIN o el propio profesional pueden modificar su disponibilidad");
        }
        if (!profesional.isActivo()) {
            throw new ConflictoException("El profesional está dado de baja: no se puede modificar su disponibilidad");
        }
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
