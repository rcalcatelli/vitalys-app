import type { EstadoTurno } from "../../../types/turno";
import { etiquetaEstado, tonoEstado, type TonoChip } from "../../../utils/estadoTurno";

export interface EstadoChipProps {
  estado: EstadoTurno;
  /** En la agenda del profesional COMPLETADO se lee "Atendido". */
  vistaProfesional?: boolean;
}

const CLASES: Record<TonoChip, string> = {
  ok: "bg-ok-soft text-ok-ink",
  warn: "bg-warn-soft text-warn-ink",
  bad: "bg-bad-soft text-bad-ink",
  clin: "bg-clin-soft text-clin-ink",
  neu: "bg-surface-2 text-ink-2",
};

/** Átomo: chip del estado de un turno (color según el design system). */
export function EstadoChip({ estado, vistaProfesional = false }: EstadoChipProps) {
  return (
    <span
      className={[
        "inline-flex h-6 items-center rounded-full px-2.5 text-xs font-semibold whitespace-nowrap",
        CLASES[tonoEstado(estado)],
      ].join(" ")}
    >
      {etiquetaEstado(estado, vistaProfesional)}
    </span>
  );
}
