import type { TurnoAfectado } from "../../../types/profesional";
import { fechaLarga, horaCorta } from "../../../utils/formato";

export interface TurnosAfectadosListProps {
  turnos: TurnoAfectado[];
}

/** Molécula: lista de turnos que se cancelarían (RN-24 / RN-25), compartida por la baja y la reducción de disponibilidad. */
export function TurnosAfectadosList({ turnos }: TurnosAfectadosListProps) {
  return (
    <ul
      aria-label="Turnos afectados"
      className="flex max-h-64 flex-col gap-px overflow-y-auto rounded-lg border border-border bg-border"
    >
      {turnos.map((t) => (
        <li
          key={t.turnoId}
          className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-0.5 bg-surface px-3 py-2.5"
        >
          <span className="font-medium text-ink">{t.paciente}</span>
          <span className="font-mono text-sm font-semibold text-ink">{horaCorta(t.inicio)}</span>
          <span className="col-span-2 text-xs text-ink-3">{fechaLarga(t.inicio)}</span>
        </li>
      ))}
    </ul>
  );
}
