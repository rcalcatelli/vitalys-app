package com.vitalys.service;

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
import com.vitalys.repository.PersonaSpecifications;
import com.vitalys.repository.UsuarioRepository;
import java.time.Clock;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import com.vitalys.service.MorosidadService.VeredictoMorosidad;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * ABM de personas (Módulo 2). La autorización por rol se verifica acá y no solo en el filtro
 * (RNF-03): un SOCIO_PACIENTE puede leer su propia ficha, pero el resto de las operaciones es
 * exclusivo del ADMIN.
 */
@Service
public class PersonaService {

    private static final Sort ORDEN = Sort.by("apellido", "nombre");

    private final PersonaRepository personaRepository;
    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final MorosidadService morosidadService;
    private final Clock clock;

    public PersonaService(
            PersonaRepository personaRepository,
            UsuarioRepository usuarioRepository,
            PasswordEncoder passwordEncoder,
            MorosidadService morosidadService,
            Clock clock) {
        this.personaRepository = personaRepository;
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
        this.morosidadService = morosidadService;
        this.clock = clock;
    }

    /**
     * Listado del ADMIN (RF-06, RF-43): solo personas con usuario SOCIO_PACIENTE (la ficha del ADMIN,
     * Laura Benítez en el seed, existe para firmar lo que opera pero no es una persona atendida).
     * La deuda sale de {@link MorosidadService#veredictos} (RN-01) y {@code conDeuda} filtra con ella.
     */
    @Transactional(readOnly = true)
    public List<PersonaResponse> listar(Usuario actor, EstadoPersona estado, String texto, boolean soloGym, boolean conDeuda) {
        exigirAdmin(actor);
        Specification<Persona> filtro = Specification.where(PersonaSpecifications.conEstado(estado))
                .and(PersonaSpecifications.soloSociosGym(soloGym))
                .and(PersonaSpecifications.coincideCon(texto))
                .and(PersonaSpecifications.conRolDeUsuario(RolUsuario.SOCIO_PACIENTE));
        return enriquecer(personaRepository.findAll(filtro, ORDEN), conDeuda);
    }

    private List<PersonaResponse> enriquecer(List<Persona> personas, boolean soloConDeuda) {
        if (personas.isEmpty()) {
            return List.of();
        }
        Map<Long, VeredictoMorosidad> veredictos = morosidadService.veredictos(personas);
        List<Long> ids = personas.stream().map(Persona::getId).toList();
        Map<Long, List<Especialidad>> especialidades = new HashMap<>();
        for (Object[] fila : personaRepository.especialidadesAtendidas(ids)) {
            especialidades
                    .computeIfAbsent(((Number) fila[0]).longValue(), k -> new ArrayList<>())
                    .add(Especialidad.valueOf((String) fila[1]));
        }
        return personas.stream()
                .filter(p -> !soloConDeuda || veredictos.get(p.getId()).deuda().periodosImpagos() > 0)
                .map(p -> PersonaResponse.de(p, veredictos.get(p.getId()), especialidades.getOrDefault(p.getId(), List.of())))
                .toList();
    }

    @Transactional(readOnly = true)
    public PersonaResponse obtener(Usuario actor, Long id) {
        Persona persona = buscar(id);
        boolean esPropia = persona.getUsuario().getId().equals(actor.getId());
        if (!esAdmin(actor) && !esPropia) {
            throw new AccesoDenegadoException("Solo podés consultar tu propia ficha");
        }
        return enriquecer(List.of(persona), false).get(0);
    }

    /** Alta presencial (RF-05): usuario SOCIO_PACIENTE + persona en una sola transacción. */
    @Transactional
    public PersonaResponse crear(Usuario actor, PersonaAltaRequest request) {
        exigirAdmin(actor);
        PersonaDatosRequest datos = request.datos();
        validarMembresia(datos);
        if (personaRepository.existsByDni(datos.dni())) {
            throw new ConflictoException("Ya existe una persona con el DNI " + datos.dni());
        }
        if (usuarioRepository.findByEmail(request.email()).isPresent()) {
            throw new EmailDuplicadoException("El email ya está registrado");
        }

        Usuario usuario = usuarioRepository.save(new Usuario(
                request.email(), passwordEncoder.encode(request.contrasena()), RolUsuario.SOCIO_PACIENTE));
        Persona persona = new Persona(usuario, hoy());
        aplicarDatos(persona, datos);
        return PersonaResponse.de(guardar(persona));
    }

    /**
     * Vínculo (RF-31, HU-07): crea la ficha de una persona para un usuario que ya se registró
     * solo, sin crear un usuario nuevo. El rol se verifica antes de buscar el email: un actor que
     * no es ADMIN recibe 403 y nunca llega a saber si la dirección está registrada (CA-07-4).
     */
    @Transactional
    public PersonaResponse vincular(Usuario actor, PersonaVinculoRequest request) {
        exigirAdmin(actor);
        if (request.contrasena() != null) {
            throw new DatosInvalidosException("El vínculo no lleva contraseña: el usuario ya tiene la suya");
        }
        Usuario usuario = usuarioRepository
                .findByEmail(request.email().trim())
                .orElseThrow(() -> new RecursoNoEncontradoException("No existe un usuario registrado con ese email"));
        if (personaRepository.findByUsuarioId(usuario.getId()).isPresent()) {
            throw new ConflictoException("Ese usuario ya está vinculado a una persona");
        }
        if (usuario.getRol() != RolUsuario.SOCIO_PACIENTE) {
            throw new ReglaDeNegocioException("Solo se vinculan usuarios con rol SOCIO_PACIENTE");
        }
        PersonaDatosRequest datos = request.datos();
        validarMembresia(datos);
        if (personaRepository.existsByDni(datos.dni())) {
            throw new ConflictoException("Ya existe una persona con el DNI " + datos.dni());
        }
        Persona persona = new Persona(usuario, hoy());
        aplicarDatos(persona, datos);
        return PersonaResponse.de(guardar(persona));
    }

    @Transactional
    public PersonaResponse actualizar(Usuario actor, Long id, PersonaDatosRequest datos) {
        exigirAdmin(actor);
        Persona persona = buscar(id);
        validarMembresia(datos);
        if (personaRepository.existsByDniAndIdNot(datos.dni(), id)) {
            throw new ConflictoException("Ya existe otra persona con el DNI " + datos.dni());
        }
        aplicarDatos(persona, datos);
        return PersonaResponse.de(guardar(persona));
    }

    @Transactional
    public PersonaResponse darDeBaja(Usuario actor, Long id) {
        exigirAdmin(actor);
        Persona persona = buscar(id);
        if (!persona.estaActiva()) {
            throw new ConflictoException("La persona ya está dada de baja");
        }
        persona.darDeBaja(hoy());
        return PersonaResponse.de(guardar(persona));
    }

    @Transactional
    public PersonaResponse reactivar(Usuario actor, Long id) {
        exigirAdmin(actor);
        Persona persona = buscar(id);
        if (persona.estaActiva()) {
            throw new ConflictoException("La persona ya está activa");
        }
        persona.reactivar();
        return PersonaResponse.de(guardar(persona));
    }

    private void aplicarDatos(Persona persona, PersonaDatosRequest datos) {
        persona.setNombre(datos.nombre().trim());
        persona.setApellido(datos.apellido().trim());
        persona.setDni(datos.dni());
        persona.setTelefono(datos.telefono());
        persona.setFechaNacimiento(datos.fechaNacimiento());
        persona.definirMembresiaGym(datos.esSocioGym(), datos.fechaInicioMembresia());
    }

    /** {@code chk_fecha_inicio_membresia}: se valida antes para responder 400 y no un 409 genérico. */
    private void validarMembresia(PersonaDatosRequest datos) {
        if (datos.esSocioGym() && datos.fechaInicioMembresia() == null) {
            throw new DatosInvalidosException("Un socio del gimnasio necesita fecha de inicio de membresía");
        }
    }

    /**
     * La unicidad del DNI la garantiza la base ({@code personas.dni UNIQUE}). La verificación
     * previa da un mensaje claro en el caso común; esta captura cubre dos altas simultáneas.
     */
    private Persona guardar(Persona persona) {
        try {
            return personaRepository.saveAndFlush(persona);
        } catch (DataIntegrityViolationException ex) {
            throw new ConflictoException("Ya existe una persona con el DNI " + persona.getDni());
        }
    }

    private Persona buscar(Long id) {
        return personaRepository
                .findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("No existe la persona " + id));
    }

    private void exigirAdmin(Usuario actor) {
        if (!esAdmin(actor)) {
            throw new AccesoDenegadoException("Operación exclusiva del rol ADMIN");
        }
    }

    private static boolean esAdmin(Usuario actor) {
        return actor.getRol() == RolUsuario.ADMIN;
    }

    private LocalDate hoy() {
        return LocalDate.now(clock);
    }
}
