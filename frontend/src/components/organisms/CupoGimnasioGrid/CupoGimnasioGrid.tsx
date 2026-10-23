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

/** Una franja deja de poder reservarse 1 h antes de su inicio (RN-18). */
const MS_CIERRE = 60 * 60 * 1000;

/**
 * Organismo presentacional: grilla de franjas de 60 min como en el diseño (hora de inicio, fin,
 * barra de ocupación, `ocupados/cupo` y una nota). La nota explica por qué no se puede elegir.
 */
export function CupoGimnasioGrid({
  franjas,
  ahora,
  tuTurno,
  seleccionada,
  onElegir,
}: CupoGimnasioGridProps) {
  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,150px),1fr))] gap-2.5">
      {franjas.map((f) => {
        const esMia = tuTurno !== null && esMismoInstante(f.inicio, tuTurno);
        const inicio = new Date(f.inicio).getTime();
        let motivo: string | null = null;
        if (esMia) motivo = "Tu turno";
        else if (inicio <= ahora.getTime()) motivo = "Ya pasó";
        else if (inicio - MS_CIERRE < ahora.getTime()) motivo = "Cierra 1 h antes";
        else if (tuTurno !== null) motivo = "Ya tenés turno este día";
        else if (f.disponibles <= 0) motivo = "Cupo completo";
        const deshabilitada = motivo !== null;
        const elegida = seleccionada !== null && esMismoInstante(f.inicio, seleccionada);
        const libres = f.disponibles === 1 ? "1 lugar libre" : `${f.disponibles} lugares libres`;
        const nota = motivo ?? libres;
        return (
          <li key={f.inicio}>
            <button
              type="button"
              disabled={deshabilitada}
              aria-pressed={elegida}
              aria-label={`${horaBA(f.inicio)} – ${horaBA(f.fin)}, ${nota}`}
              onClick={() => onElegir(f.inicio)}
              className={[
                "flex min-h-11 w-full flex-col gap-[9px] rounded-lg border-[1.5px] px-3 pt-3 pb-[11px] text-left text-ink",
                elegida || esMia ? "border-gym" : "border-border",
                elegida ? "bg-gym-soft" : deshabilitada && !esMia ? "bg-surface-2" : "bg-surface",
                deshabilitada && !esMia ? "opacity-70" : "",
              ].join(" ")}
            >
              <span className="flex w-full items-baseline justify-between">
                <span className="font-mono text-[17px] font-semibold">{horaBA(f.inicio)}</span>
                <span className="font-mono text-[11.5px] text-ink-3">– {horaBA(f.fin)}</span>
              </span>
              <span className="block h-1.5 w-full overflow-hidden rounded-[3px] bg-surface-2">
                <span
                  className={`block h-full rounded-[3px] ${esMia || !deshabilitada ? "bg-gym" : "bg-ink-3"}`}
                  style={{ width: `${Math.min(100, (f.ocupados / f.cupo) * 100)}%` }}
                />
              </span>
              <span className="flex w-full justify-between gap-1.5 text-xs">
                <span className="font-mono text-ink-2">
                  {f.ocupados}/{f.cupo}
                </span>
                <span
                  className={[
                    "text-right font-medium",
                    esMia
                      ? "text-gym-ink"
                      : motivo === "Cupo completo"
                        ? "text-bad-ink"
                        : deshabilitada
                          ? "text-ink-3"
                          : "text-ok-ink",
                  ].join(" ")}
                >
                  {nota}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
