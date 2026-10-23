import type { FranjaApi } from "../types/disponibilidad";
import type { TurnoAgenda } from "../types/turno";
import { aHora, aMinutos, normalizarHora } from "./disponibilidad";
import { estaCancelado } from "./estadoTurno";
import { diaSemana, instanteBA } from "./fechaBA";

/**
 * Anticipación con la que el backend deja registrar la asistencia ("Atendido"): 15 min antes del
 * inicio (`TurnoService.MINUTOS_CHECKIN_ANTICIPADO`). "Ausente" se habilita recién desde el inicio.
 * El diseño dice "desde el inicio" para ambos: el backend manda (RNF-03).
 */
export const MINUTOS_ANTICIPO_ATENDIDO = 15;

/** Un lugar de la agenda sin turno, derivado de la disponibilidad (franjas semanales). */
export interface Hueco {
  inicio: string;
  fin: string;
}

const ms = (iso: string) => new Date(iso).getTime();

/**
 * Huecos libres de `fecha`: los horarios que salen de cortar cada franja del día en turnos de
 * `duracion` minutos, menos los que se pisan con un turno vigente (los cancelados no ocupan lugar).
 */
export function huecosLibres(
  franjas: FranjaApi[],
  duracion: number,
  fecha: string,
  turnos: Pick<TurnoAgenda, "inicio" | "fin" | "estado">[],
): Hueco[] {
  if (duracion <= 0) return [];
  const ocupados = turnos.filter((t) => !estaCancelado(t.estado));
  const huecos: Hueco[] = [];
  for (const f of franjas.filter((x) => x.diaSemana === diaSemana(fecha))) {
    const fin = aMinutos(normalizarHora(f.horaFin));
    for (let t = aMinutos(normalizarHora(f.horaInicio)); t + duracion <= fin; t += duracion) {
      const hueco = {
        inicio: instanteBA(fecha, aHora(t)),
        fin: instanteBA(fecha, aHora(t + duracion)),
      };
      const pisado = ocupados.some(
        (o) => ms(o.inicio) < ms(hueco.fin) && ms(hueco.inicio) < ms(o.fin),
      );
      if (!pisado) huecos.push(hueco);
    }
  }
  return huecos.sort((a, b) => ms(a.inicio) - ms(b.inicio));
}
