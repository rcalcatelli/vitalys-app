import type { EstadoTurno } from "../../../types/turno";
import { etiquetaEstado, tonoEstado } from "../../../utils/estadoTurno";
import { Chip } from "../Chip";

export interface EstadoChipProps {
  estado: EstadoTurno;
  /** En la agenda del profesional COMPLETADO se lee "Atendido". */
  vistaProfesional?: boolean;
}

/** Átomo: chip del estado de un turno (color según el design system). */
export function EstadoChip({ estado, vistaProfesional = false }: EstadoChipProps) {
  const tono = tonoEstado(estado);
  return (
    <Chip tone={tono === "neu" ? "neutral" : tono}>{etiquetaEstado(estado, vistaProfesional)}</Chip>
  );
}
