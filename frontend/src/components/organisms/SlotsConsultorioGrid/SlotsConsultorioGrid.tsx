import type { SlotConsultorio } from "../../../types/turno";
import { horaBA } from "../../../utils/fechaBA";

export interface SlotsConsultorioGridProps {
  slots: SlotConsultorio[];
  /** Inicio (ISO) del horario elegido, si hay uno. */
  seleccionado: string | null;
  onElegir: (inicio: string) => void;
}

/** Organismo presentacional: horarios de un profesional; los que no están libres no responden al clic. */
export function SlotsConsultorioGrid({ slots, seleccionado, onElegir }: SlotsConsultorioGridProps) {
  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(88px,1fr))] gap-2">
      {slots.map((s) => {
        const elegido = seleccionado === s.inicio;
        return (
          <li key={s.inicio}>
            <button
              type="button"
              disabled={!s.libre}
              aria-pressed={elegido}
              onClick={() => onElegir(s.inicio)}
              className={[
                "flex h-14 w-full flex-col items-center justify-center gap-px rounded-lg border-[1.5px]",
                elegido
                  ? "border-clin bg-clin text-on-clin"
                  : s.libre
                    ? "border-border bg-surface text-ink"
                    : "border-border bg-surface-2 text-ink-3 opacity-55",
              ].join(" ")}
            >
              <span className="font-mono text-[15px] font-semibold">{horaBA(s.inicio)}</span>
              <span className="text-[11px]">{s.libre ? "Libre" : "No disponible"}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
