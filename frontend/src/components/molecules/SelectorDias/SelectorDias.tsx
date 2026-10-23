export interface DiaSelector {
  /** `YYYY-MM-DD`. */
  fecha: string;
  dow: string;
  num: number;
  /** Texto chico bajo el número: Hoy, Feriado, Cerrado, Tu turno… */
  sub: string;
  cerrado: boolean;
}

export interface SelectorDiasProps {
  dias: DiaSelector[];
  activa: string;
  onElegir: (fecha: string) => void;
  /** Gimnasio pinta el día activo en naranja; consultorio en teal. */
  tono: "gym" | "clin";
}

/** Molécula: tira horizontal de días para elegir uno (solo comodidad de la UI; el backend valida). */
export function SelectorDias({ dias, activa, onElegir, tono }: SelectorDiasProps) {
  const activo =
    tono === "gym" ? "border-gym bg-gym text-on-gym" : "border-clin bg-clin text-on-clin";
  return (
    <div role="group" aria-label="Día" className="-mx-0.5 flex gap-2 overflow-x-auto pb-1">
      {dias.map((d) => {
        const esActivo = d.fecha === activa;
        return (
          <button
            key={d.fecha}
            type="button"
            aria-pressed={esActivo}
            aria-label={`${d.dow} ${d.num}${d.sub ? `, ${d.sub}` : ""}`}
            onClick={() => onElegir(d.fecha)}
            className={[
              "flex min-h-[76px] flex-[1_0_64px] flex-col items-center justify-center gap-0.5 rounded-xl border-[1.5px] px-1 py-2",
              esActivo ? activo : "border-border bg-surface text-ink",
              d.cerrado && !esActivo ? "text-ink-3 opacity-60" : "",
            ].join(" ")}
          >
            <span className="text-[11.5px] font-semibold tracking-wide uppercase">{d.dow}</span>
            <span className="font-heading text-[22px] leading-[1.1] font-semibold">{d.num}</span>
            <span className="min-h-3.5 text-[11px] font-medium">{d.sub}</span>
          </button>
        );
      })}
    </div>
  );
}
