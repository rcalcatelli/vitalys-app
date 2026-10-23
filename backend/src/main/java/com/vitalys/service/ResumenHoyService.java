package com.vitalys.service;

import com.vitalys.domain.EstadoPersona;
import com.vitalys.domain.Persona;
import com.vitalys.domain.RolUsuario;
import com.vitalys.domain.Usuario;
import com.vitalys.dto.FranjaGymResponse;
import com.vitalys.dto.ResumenHoyResponse;
import com.vitalys.dto.SocioConDeudaResponse;
import com.vitalys.exception.AccesoDenegadoException;
import com.vitalys.repository.PersonaRepository;
import com.vitalys.repository.PersonaSpecifications;
import com.vitalys.service.MorosidadService.VeredictoMorosidad;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import org.springframework.data.domain.Sort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Panel de inicio del ADMIN ("Hoy en el centro", W-09): lo que pasa hoy en el gimnasio y en los
 * consultorios, y quién necesita atención por deuda. No calcula reglas propias: la ocupación sale
 * de {@link TurnoService#cupoGym} y la deuda de {@link MorosidadService#veredictos} (en lote, sin consultar por socio), las mismas que
 * usan la reserva y el estado de cuenta.
 */
@Service
public class ResumenHoyService {

    private static final ZoneId ZONA = ZoneId.of("America/Argentina/Buenos_Aires");

    private final TurnoService turnoService;
    private final MorosidadService morosidadService;
    private final PersonaRepository personaRepository;
    private final JdbcTemplate jdbcTemplate;
    private final Clock clock;

    public ResumenHoyService(
            TurnoService turnoService,
            MorosidadService morosidadService,
            PersonaRepository personaRepository,
            JdbcTemplate jdbcTemplate,
            Clock clock) {
        this.turnoService = turnoService;
        this.morosidadService = morosidadService;
        this.personaRepository = personaRepository;
        this.jdbcTemplate = jdbcTemplate;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public ResumenHoyResponse resumen(Usuario actor) {
        if (actor.getRol() != RolUsuario.ADMIN) {
            throw new AccesoDenegadoException("Operación exclusiva del rol ADMIN");
        }
        OffsetDateTime ahora = OffsetDateTime.now(clock);
        LocalDate hoy = ahora.atZoneSameInstant(ZONA).toLocalDate();
        Timestamp desde = Timestamp.from(hoy.atStartOfDay(ZONA).toInstant());
        Timestamp hasta = Timestamp.from(hoy.plusDays(1).atStartOfDay(ZONA).toInstant());

        List<FranjaGymResponse> franjas = turnoService.cupoGym(hoy);
        int turnosGym = franjas.stream().mapToInt(FranjaGymResponse::ocupados).sum();
        int consultas = contar(
                "SELECT COUNT(*) FROM turnos WHERE tipo_turno = 'CONSULTORIO' AND inicio >= ? AND inicio < ? "
                        + "AND fn_turno_ocupa_lugar(estado, inicio, cancelado_en)",
                desde, hasta);
        Timestamp momento = Timestamp.from(ahora.toInstant());
        int enGimnasio = contar(
                "SELECT COUNT(*) FROM turnos WHERE tipo_turno = 'GYM' AND estado = 'COMPLETADO' AND inicio <= ? AND fin > ?",
                momento, momento);

        List<SocioConDeudaResponse> atencion = new ArrayList<>();
        List<Persona> socios = personaRepository.findAll(
                PersonaSpecifications.conEstado(EstadoPersona.ACTIVO).and(PersonaSpecifications.soloSociosGym(true)),
                Sort.by("apellido", "nombre"));
        Map<Long, VeredictoMorosidad> veredictos = morosidadService.veredictos(socios);
        for (Persona p : socios) {
            VeredictoMorosidad v = veredictos.get(p.getId());
            if (v.deuda().periodosImpagos() == 0) {
                continue;
            }
            atencion.add(new SocioConDeudaResponse(
                    p.getId(),
                    p.getApellido() + ", " + p.getNombre(),
                    p.getNombre(),
                    p.getApellido(),
                    p.getDni(),
                    v.deuda().periodosImpagos(),
                    v.deuda().umbral(),
                    v.bloqueado(),
                    v.excepcion().map(e -> e.getValidaHasta()).orElse(null)));
        }
        atencion.sort(Comparator.comparingInt(SocioConDeudaResponse::periodosImpagos).reversed());
        int suspendidos = (int) atencion.stream().filter(SocioConDeudaResponse::suspendido).count();

        return new ResumenHoyResponse(hoy, enGimnasio, turnosGym, consultas, atencion.size(), suspendidos, franjas, atencion);
    }

    private int contar(String sql, Object... args) {
        Integer n = jdbcTemplate.queryForObject(sql, Integer.class, args);
        return n == null ? 0 : n;
    }
}
