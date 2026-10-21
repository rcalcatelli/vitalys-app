import type { FranjaApi, FranjaEditable, FranjaInput } from "../types/disponibilidad";

// El backend numera 1 = lunes … 7 = domingo; el índice 0 se deja para que `dia % 7` resuelva el domingo.
const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const DIAS_CORTOS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

/** Días de atención del mockup (lunes a sábado). El domingo solo aparece si ya hay una franja cargada. */
export const DIAS_BASE = [1, 2, 3, 4, 5, 6];

/** Hora de inicio y de fin de la grilla semanal (07:00 a 21:00). */
export const HORA_INICIO_GRILLA = 7;
export const HORA_FIN_GRILLA = 21;

export function nombreDia(dia: number): string {
  return DIAS[dia % 7];
}

export function nombreDiaCorto(dia: number): string {
  return DIAS_CORTOS[dia % 7];
}

export function aMinutos(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function dosDigitos(n: number): string {
  return String(n).padStart(2, "0");
}

export function aHora(minutos: number): string {
  return `${dosDigitos(Math.floor(minutos / 60))}:${dosDigitos(minutos % 60)}`;
}

/** Opciones de hora cada 30 min, de 07:00 a 21:00. */
export function opcionesDeHora(): string[] {
  const horas: string[] = [];
  for (let m = HORA_INICIO_GRILLA * 60; m <= HORA_FIN_GRILLA * 60; m += 30) horas.push(aHora(m));
  return horas;
}

/** El backend serializa `LocalTime` como `HH:mm:ss`; el editor trabaja con `HH:mm`. */
export function normalizarHora(hora: string): string {
  return hora.slice(0, 5);
}

export function aEditables(franjas: FranjaApi[]): FranjaEditable[] {
  return franjas.map((f) => ({
    clave: `f${f.id}`,
    diaSemana: f.diaSemana,
    horaInicio: normalizarHora(f.horaInicio),
    horaFin: normalizarHora(f.horaFin),
  }));
}

export function sinClaves(filas: FranjaEditable[]): FranjaInput[] {
  return filas.map(({ diaSemana, horaInicio, horaFin }) => ({ diaSemana, horaInicio, horaFin }));
}

/**
 * Valida el borrador en el cliente (RN-11): fin posterior al inicio y sin solapamiento con
 * otra franja del mismo día. Devuelve el mensaje por `clave` de fila. El servidor sigue
 * siendo quien decide (trigger de exclusión), esto solo adelanta el error junto a la fila.
 */
export function validarFranjas(filas: FranjaEditable[]): Record<string, string> {
  const errores: Record<string, string> = {};
  for (const a of filas) {
    if (aMinutos(a.horaFin) <= aMinutos(a.horaInicio)) {
      errores[a.clave] = "El horario de fin tiene que ser posterior al de inicio.";
      continue;
    }
    const otra = filas.find(
      (b) =>
        b.clave !== a.clave &&
        b.diaSemana === a.diaSemana &&
        aMinutos(b.horaInicio) < aMinutos(a.horaFin) &&
        aMinutos(a.horaInicio) < aMinutos(b.horaFin),
    );
    if (otra) {
      errores[a.clave] =
        `Se superpone con ${nombreDia(otra.diaSemana)} ${otra.horaInicio}–${otra.horaFin}.`;
    }
  }
  return errores;
}

function firma(filas: FranjaEditable[]): string {
  return JSON.stringify(
    sinClaves(filas).sort(
      (a, b) =>
        a.diaSemana - b.diaSemana ||
        a.horaInicio.localeCompare(b.horaInicio) ||
        a.horaFin.localeCompare(b.horaFin),
    ),
  );
}

/** `true` si ambos borradores describen las mismas franjas (sin importar el orden ni las claves). */
export function mismoConjunto(a: FranjaEditable[], b: FranjaEditable[]): boolean {
  return firma(a) === firma(b);
}

/** Días a mostrar en la grilla: lunes a sábado, más el domingo si hay alguna franja ese día. */
export function diasVisibles(filas: FranjaEditable[]): number[] {
  return filas.some((f) => f.diaSemana === 7) ? [...DIAS_BASE, 7] : DIAS_BASE;
}
