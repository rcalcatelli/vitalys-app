package com.vitalys.service;

import com.vitalys.config.EmailProperties;
import com.vitalys.domain.Notificacion;
import com.vitalys.domain.Profesional;
import com.vitalys.domain.RolUsuario;
import com.vitalys.domain.Usuario;
import com.vitalys.dto.NotificacionFallidaResponse;
import com.vitalys.exception.AccesoDenegadoException;
import com.vitalys.repository.NotificacionRepository;
import com.vitalys.repository.ProfesionalRepository;
import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Alerta del ADMIN por avisos que no llegaron (RN-24: la cancelación ya está hecha). */
@Service
public class NotificacionService {

    private final NotificacionRepository notificacionRepository;
    private final ProfesionalRepository profesionalRepository;
    private final EmailProperties propiedades;
    private final Clock clock;

    public NotificacionService(
            NotificacionRepository notificacionRepository,
            ProfesionalRepository profesionalRepository,
            EmailProperties propiedades,
            Clock clock) {
        this.notificacionRepository = notificacionRepository;
        this.profesionalRepository = profesionalRepository;
        this.propiedades = propiedades;
        this.clock = clock;
    }

    /** Definitivas (2 intentos fallidos) y huérfanas (en curso más viejas que el umbral). */
    @Transactional(readOnly = true)
    public List<NotificacionFallidaResponse> listarFallidas(Usuario actor) {
        if (actor.getRol() != RolUsuario.ADMIN) {
            throw new AccesoDenegadoException("Operación exclusiva del rol ADMIN");
        }
        OffsetDateTime limite = OffsetDateTime.now(clock).minus(propiedades.getUmbralHuerfanas());
        List<Notificacion> fallidas = notificacionRepository.buscarFallidas(Notificacion.MAX_INTENTOS, limite);

        List<Long> profesionalIds = fallidas.stream()
                .map(Notificacion::getTurno)
                .filter(Objects::nonNull)
                .map(t -> t.getProfesionalId())
                .filter(Objects::nonNull)
                .distinct()
                .toList();
        Map<Long, String> nombres = new HashMap<>();
        for (Profesional p : profesionalRepository.findAllById(profesionalIds)) {
            nombres.put(p.getId(), p.getNombre() + " " + p.getApellido());
        }

        return fallidas.stream()
                .map(n -> NotificacionFallidaResponse.de(
                        n,
                        n.getTurno() == null ? null : nombres.get(n.getTurno().getProfesionalId()),
                        clock))
                .toList();
    }
}
