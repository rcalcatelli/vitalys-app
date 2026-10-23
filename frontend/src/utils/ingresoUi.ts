import type { FranjaGym, Turno } from "../types/turno";

/**
 * El backend deja marcar el ingreso desde 15 minutos antes del inicio (`MINUTOS_CHECKIN_ANTICIPADO`
 * en `TurnoService`). La pantalla de Ingreso muestra la franja que corresponde a esa ventana.
 */
export const MINUTOS_CHECKIN_ANTICIPADO = 15;

/**
 * Franja que muestra "Ingreso al gimnasio": la que está en curso o, si no hay ninguna, la próxima
 * que ya abrió su ventana de ingreso (inicio − 15 min). `null` si no hay franja para atender.
 */
export function franjaDeIngreso(franjas: FranjaGym[], ahora: Date): FranjaGym | null {
  const t = ahora.getTime();
  const enCurso = franjas.find(
    (f) => new Date(f.inicio).getTime() <= t && t < new Date(f.fin).getTime(),
  );
  if (enCurso) return enCurso;
  return (
    franjas.find((f) => {
      const inicio = new Date(f.inicio).getTime();
      return t < inicio && inicio - t <= MINUTOS_CHECKIN_ANTICIPADO * 60_000;
    }) ?? null
  );
}

/** La franja ya empezó (si no, es la próxima, cuya ventana de ingreso recién abrió). */
export function franjaIniciada(franja: FranjaGym, ahora: Date): boolean {
  return new Date(franja.inicio).getTime() <= ahora.getTime();
}

/** Turnos de gimnasio de `franja` que siguen en pie (los cancelados no ocupan lugar ni ingresan). */
export function turnosDeFranja(turnos: Turno[], franja: FranjaGym): Turno[] {
  const inicio = new Date(franja.inicio).getTime();
  return turnos.filter(
    (t) =>
      t.tipoTurno === "GYM" &&
      new Date(t.inicio).getTime() === inicio &&
      !t.estado.startsWith("CANCELADO"),
  );
}

/** Pendientes primero y ya ingresados después, por hora de ingreso; el resto conserva su orden. */
export function ordenarIngresos(turnos: Turno[]): Turno[] {
  const peso = (t: Turno) => (t.estado === "COMPLETADO" ? 1 : 0);
  const hora = (t: Turno) => (t.completadoEn ? new Date(t.completadoEn).getTime() : 0);
  return [...turnos].sort((a, b) => peso(a) - peso(b) || hora(a) - hora(b));
}

/** Coincide con el texto por nombre y apellido (sin importar tildes ni mayúsculas) o por DNI parcial. */
export function coincideBusqueda(turno: Turno, texto: string): boolean {
  const q = normalizar(texto.trim());
  if (!q) return true;
  const nombre = normalizar(`${turno.personaNombre} ${turno.personaApellido}`);
  const inverso = normalizar(`${turno.personaApellido} ${turno.personaNombre}`);
  const dniBuscado = q.replace(/\D/g, "");
  return (
    nombre.includes(q) ||
    inverso.includes(q) ||
    (dniBuscado !== "" && (turno.personaDni ?? "").includes(dniBuscado))
  );
}

function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}
