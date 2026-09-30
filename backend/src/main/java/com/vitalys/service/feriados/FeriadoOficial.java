package com.vitalys.service.feriados;

import com.vitalys.domain.TipoFeriado;
import java.time.LocalDate;

/**
 * Un feriado tal como lo publica la fuente oficial, ya normalizado. Es el contrato entre
 * {@link FeriadosOficialesClient} —que sabe de HTTP y de JSON-LD— y
 * {@link SincronizadorFeriados}, que solo sabe de negocio.
 */
public record FeriadoOficial(LocalDate fecha, String nombre, TipoFeriado tipo) {}
