package com.vitalys.service;

import com.vitalys.domain.Profesional;
import com.vitalys.domain.RolUsuario;
import com.vitalys.domain.Usuario;
import com.vitalys.dto.ProfesionalAltaRequest;
import com.vitalys.dto.ProfesionalDatosRequest;
import com.vitalys.dto.ImpactoResponse;
import com.vitalys.dto.ProfesionalResponse;
import com.vitalys.exception.AccesoDenegadoException;
import com.vitalys.exception.ConflictoException;
import com.vitalys.exception.EmailDuplicadoException;
import com.vitalys.exception.RecursoNoEncontradoException;
import com.vitalys.repository.DisponibilidadProfesionalRepository;
import com.vitalys.repository.ProfesionalRepository;
import com.vitalys.repository.UsuarioRepository;
import java.util.List;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * ABM de profesionales (Módulo 3). Igual que {@link PersonaService}, la autorización por rol se
 * verifica acá y no solo en el filtro (RNF-03). Cualquier usuario autenticado puede consultar el
 * listado y la ficha (un paciente necesita elegir con quién sacar turno), pero el email solo lo ve
 * el ADMIN o el propio profesional; el resto de las operaciones es exclusivo del ADMIN.
 */
@Service
public class ProfesionalService {

    private static final Sort ORDEN = Sort.by("apellido", "nombre");

    private final ProfesionalRepository profesionalRepository;
    private final DisponibilidadProfesionalRepository disponibilidadRepository;
    private final CascadaDisponibilidadService cascada;
    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;

    public ProfesionalService(
            ProfesionalRepository profesionalRepository,
            DisponibilidadProfesionalRepository disponibilidadRepository,
            CascadaDisponibilidadService cascada,
            UsuarioRepository usuarioRepository,
            PasswordEncoder passwordEncoder) {
        this.profesionalRepository = profesionalRepository;
        this.disponibilidadRepository = disponibilidadRepository;
        this.cascada = cascada;
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
    }

    /**
     * RF-12: listado para cualquier usuario autenticado. El ADMIN puede filtrar por estado y ve el
     * email; los demás solo ven profesionales activos (los de baja no son elegibles) y sin email.
     */
    @Transactional(readOnly = true)
    public List<ProfesionalResponse> listar(Usuario actor, Boolean activo) {
        if (esAdmin(actor)) {
            List<Profesional> profesionales = activo == null
                    ? profesionalRepository.findAll(ORDEN)
                    : profesionalRepository.findByActivo(activo, ORDEN);
            return profesionales.stream().map(ProfesionalResponse::de).toList();
        }
        return profesionalRepository.findByActivo(true, ORDEN).stream()
                .map(ProfesionalResponse::publica)
                .toList();
    }

    /** Ficha completa para el ADMIN y el propio profesional; vista pública (sin email) para el resto. */
    @Transactional(readOnly = true)
    public ProfesionalResponse obtener(Usuario actor, Long id) {
        Profesional profesional = buscar(id);
        boolean esPropio = profesional.getUsuario().getId().equals(actor.getId());
        if (esAdmin(actor) || esPropio) {
            return ProfesionalResponse.de(profesional);
        }
        if (!profesional.isActivo()) {
            throw new RecursoNoEncontradoException("No existe el profesional " + id);
        }
        return ProfesionalResponse.publica(profesional);
    }

    /**
     * Ficha del profesional autenticado. Si el usuario no tiene fila en {@code profesionales} (un
     * ADMIN, o un usuario PROFESIONAL sin ficha) es 404 y no 403: el rol ya fue aceptado y lo que
     * falta es el recurso; un 403 sugeriría un problema de permisos y filtraría el rol como causa.
     */
    @Transactional(readOnly = true)
    public ProfesionalResponse miPerfil(Usuario actor) {
        if (actor.getRol() == RolUsuario.SOCIO_PACIENTE) {
            throw new AccesoDenegadoException("Operación exclusiva de los roles ADMIN y PROFESIONAL");
        }
        return profesionalRepository
                .findByUsuarioId(actor.getId())
                .map(ProfesionalResponse::de)
                .orElseThrow(() -> new RecursoNoEncontradoException("El usuario no tiene un profesional asociado"));
    }

    /** Alta (RF-11): usuario PROFESIONAL con contraseña inicial + profesional, en una sola transacción. */
    @Transactional
    public ProfesionalResponse crear(Usuario actor, ProfesionalAltaRequest request) {
        exigirAdmin(actor);
        if (usuarioRepository.findByEmail(request.email()).isPresent()) {
            throw new EmailDuplicadoException("El email ya está registrado");
        }

        Usuario usuario = guardarUsuario(
                new Usuario(request.email(), passwordEncoder.encode(request.contrasena()), RolUsuario.PROFESIONAL));
        Profesional profesional = new Profesional(usuario);
        aplicarDatos(profesional, request.datos());
        return ProfesionalResponse.de(guardar(profesional));
    }

    @Transactional
    public ProfesionalResponse actualizar(Usuario actor, Long id, ProfesionalDatosRequest datos) {
        exigirAdmin(actor);
        Profesional profesional = buscar(id);
        aplicarDatos(profesional, datos);
        return ProfesionalResponse.de(guardar(profesional));
    }

    /**
     * Vista previa de la baja (RN-25, paso 1): los turnos futuros que se cancelarían. Dar de baja es
     * dejar la disponibilidad en cero, así que todo turno futuro reservado queda afectado.
     */
    @Transactional(readOnly = true)
    public ImpactoResponse impactoDeBaja(Usuario actor, Long id) {
        exigirAdmin(actor);
        Profesional profesional = buscar(id);
        if (!profesional.isActivo()) {
            throw new ConflictoException("El profesional ya está dado de baja");
        }
        return cascada.impacto(id, List.of());
    }

    /**
     * Baja (RN-25, paso 2). Con turnos futuros exige {@code confirmar=true} (409 con la lista si
     * falta); sin turnos se da de baja directamente. Confirmada, en una sola transacción: cancela los
     * turnos y avisa a los pacientes, borra las franjas, desactiva al profesional y deshabilita su
     * usuario (el filtro JWT rechaza sus tokens).
     */
    @Transactional
    public ProfesionalResponse darDeBaja(Usuario actor, Long id, boolean confirmar) {
        exigirAdmin(actor);
        Profesional profesional = profesionalRepository
                .buscarParaActualizar(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("No existe el profesional " + id));
        if (!profesional.isActivo()) {
            throw new ConflictoException("El profesional ya está dado de baja");
        }
        cascada.resolver(actor, profesional, List.of(), confirmar, "El profesional fue dado de baja");
        disponibilidadRepository.deleteAll(
                disponibilidadRepository.findByProfesionalIdOrderByDiaSemanaAscHoraInicioAsc(id));
        profesional.darDeBaja();
        profesional.getUsuario().setActivo(false);
        return ProfesionalResponse.de(guardar(profesional));
    }

    /**
     * Reactivación: vuelve a habilitar al profesional y a su usuario (puede iniciar sesión de nuevo).
     * Las franjas se borraron en la baja (RN-25) y no se restauran: vuelve sin disponibilidad.
     */
    @Transactional
    public ProfesionalResponse reactivar(Usuario actor, Long id) {
        exigirAdmin(actor);
        Profesional profesional = buscar(id);
        if (profesional.isActivo()) {
            throw new ConflictoException("El profesional ya está activo");
        }
        profesional.reactivar();
        profesional.getUsuario().setActivo(true);
        return ProfesionalResponse.de(guardar(profesional));
    }

    private void aplicarDatos(Profesional profesional, ProfesionalDatosRequest datos) {
        profesional.setNombre(datos.nombre().trim());
        profesional.setApellido(datos.apellido().trim());
        profesional.setEspecialidad(datos.especialidad());
        profesional.setDuracionTurnoMinutos(datos.duracionTurnoMinutos());
    }

    /**
     * La unicidad del email la garantiza la base ({@code usuarios.email UNIQUE}). La verificación
     * previa da un mensaje claro en el caso común; esta captura cubre dos altas simultáneas. Se
     * traduce acá y no en el handler global porque este es el único lugar donde se sabe que la
     * violación es del email.
     */
    private Usuario guardarUsuario(Usuario usuario) {
        try {
            return usuarioRepository.saveAndFlush(usuario);
        } catch (DataIntegrityViolationException ex) {
            throw new EmailDuplicadoException("El email ya está registrado");
        }
    }

    /** Mismo criterio: el flush fuerza acá los errores de integridad y los traduce en lugar del handler global. */
    private Profesional guardar(Profesional profesional) {
        try {
            return profesionalRepository.saveAndFlush(profesional);
        } catch (DataIntegrityViolationException ex) {
            throw new ConflictoException(
                    "No se pudo guardar el profesional: el usuario ya tiene un profesional asociado");
        }
    }

    private Profesional buscar(Long id) {
        return profesionalRepository
                .findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("No existe el profesional " + id));
    }

    private void exigirAdmin(Usuario actor) {
        if (!esAdmin(actor)) {
            throw new AccesoDenegadoException("Operación exclusiva del rol ADMIN");
        }
    }

    private static boolean esAdmin(Usuario actor) {
        return actor.getRol() == RolUsuario.ADMIN;
    }
}
