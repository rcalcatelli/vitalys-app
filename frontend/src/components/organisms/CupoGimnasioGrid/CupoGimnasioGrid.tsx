import type { FranjaGym } from "../../../types/turno";
import { horaBA } from "../../../utils/fechaBA";

export interface CupoGimnasioGridProps {
  franjas: FranjaGym[];
  /** Instante actual inyectado: las franjas que ya empezaron no se pueden elegir. */
  ahora: Date;
  /** Inicio (ISO) del turno de gimnasio que el socio ya tiene ese día, si lo tiene. */
  tuTurno: string | null;
  /** Inicio (ISO) de la franja elegida, si hay una. */
  seleccionada: string | null;
  onElegir: (inicio: string) => void;
}

function esMismoInstante(a: string, b: string): boolean {
  return new Date(a).getTime() === new Date(b).getTime();
}

/** Organismo presentacional: grilla de franjas de 60 min con ocupación y motivo de bloqueo. */
export function CupoGimnasioGrid({
  franjas,
  ahora,
  tuTurno,
  seleccionada,
  onElegir,
}: CupoGimnasioGridProps) {
  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2">
      {franjas.map((f) => {
        const esMia = tuTurno !== null && esMismoInstante(f.inicio, tuTurno);
        let motivo: string | null = null;
        if (esMia) motivo = "Tu turno";
        else if (new Date(f.inicio).getTime() <= ahora.getTime()) motivo = "Ya pasó";
        else if (tuTurno !== null) motivo = "Ya tenés turno este día";
        else if (f.disponibles <= 0) motivo = "Cupo completo";
        const deshabilitada = motivo !== null;
        const elegida = seleccionada !== null && esMismoInstante(f.inicio, seleccionada);
        const libres = f.disponibles === 1 ? "1 lugar libre" : `${f.disponibles} lugares libres`;
        return (
          <li key={f.inicio}>
            <button
              type="button"
              disabled={deshabilitada}
              aria-pressed={elegida}
              onClick={() => onElegir(f.inicio)}
              className={[
                "flex w-full flex-col gap-1 rounded-xl border-[1.5px] p-3 text-left",
                elegida || esMia ? "border-gym" : "border-border",
                elegida ? "bg-gym-soft" : deshabilitada && !esMia ? "bg-surface-2" : "bg-surface",
                deshabilitada && !esMia ? "opacity-70" : "",
              ].join(" ")}
            >
              <span className="font-mono text-[15px] font-semibold text-ink">
                {horaBA(f.inicio)} – {horaBA(f.fin)}
              </span>
              <span className="h-1 w-full overflow-hidden rounded-full bg-surface-2">
                <span
                  className="block h-full bg-gym"
                  style={{ width: `${Math.min(100, (f.ocupados / f.cupo) * 100)}%` }}
                />
              </span>
              <span
                className={[
                  "text-xs",
                  esMia
                    ? "font-semibold text-gym-ink"
                    : motivo === "Cupo completo"
                      ? "text-bad-ink"
                      : deshabilitada
                        ? "text-ink-3"
                        : "text-ok-ink",
                ].join(" ")}
              >
                {motivo ?? libres}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
