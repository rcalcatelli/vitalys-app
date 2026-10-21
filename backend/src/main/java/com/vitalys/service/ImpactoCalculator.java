package com.vitalys.service;

import com.vitalys.domain.Turno;
import com.vitalys.dto.FranjaRequest;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;

/**
 * Cálculo puro de RN-24: qué turnos futuros quedan sin cobertura con un conjunto de franjas. Sin
 * acceso a base ni reloj propio: recibe los turnos y el "ahora", así se prueba con casos borde.
 *
 * <p>Un turno [inicio, fin) está cubierto si entra completo en UNA franja de su día de semana,
 * medido en hora argentina (las franjas son horas de pared, no instantes). Dos franjas contiguas no
 * se suman: un turno que cruza el límite entre ambas queda afuera. Los turnos que ya empezaron
 * nunca se consideran.
 */
public final class ImpactoCalculator {

    static final ZoneId ZONA = ZoneId.of("America/Argentina/Buenos_Aires");

    private ImpactoCalculator() {}

    public static List<Turno> afectados(List<Turno> turnos, List<FranjaRequest> franjas, OffsetDateTime ahora) {
        return turnos.stream()
                .filter(t -> t.getInicio().isAfter(ahora))
                .filter(t -> !cubierto(t, franjas))
                .toList();
    }

    private static boolean cubierto(Turno turno, List<FranjaRequest> franjas) {
        ZonedDateTime inicio = turno.getInicio().atZoneSameInstant(ZONA);
        ZonedDateTime fin = turno.getFin().atZoneSameInstant(ZONA);
        if (!inicio.toLocalDate().equals(fin.toLocalDate())) {
            return false; // cruza la medianoche: ninguna franja diaria puede contenerlo
        }
        int dia = inicio.getDayOfWeek().getValue();
        LocalTime desde = inicio.toLocalTime();
        LocalTime hasta = fin.toLocalTime();
        return franjas.stream()
                .anyMatch(f -> f.diaSemana() == dia
                        && !f.horaInicio().isAfter(desde)
                        && !f.horaFin().isBefore(hasta));
    }
}
