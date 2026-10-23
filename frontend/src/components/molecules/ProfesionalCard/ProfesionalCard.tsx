import type { ProximaAgenda } from "../../../types/turno";
import { fechaDiaMes, fechaRelativa } from "../../../utils/diasUi";
import { etiquetaEspecialidad, nombreProfesional } from "../../../utils/formato";

export interface ProfesionalCardProps {
  agenda: ProximaAgenda;
  /** Hoy en Buenos Aires (`YYYY-MM-DD`): la próxima agenda se dice relativa a hoy. */
  hoy: string;
  activo: boolean;
  onElegir: (profesionalId: number) => void;
}

/** Texto de la próxima agenda: "Próxima agenda: hoy, mar 29 sep · 2 libres" o "Sin agenda próxima". */
export function textoProximaAgenda(agenda: ProximaAgenda, hoy: string): string {
  if (agenda.fecha === null) return "Sin agenda próxima";
  const libres = agenda.libres === 1 ? "1 libre" : `${agenda.libres} libres`;
  return `Próxima agenda: ${fechaRelativa(agenda.fecha, hoy)}, ${fechaDiaMes(agenda.fecha).toLowerCase()} · ${libres}`;
}

/** Molécula: tarjeta de un profesional con su especialidad, duración y próxima agenda (paso 1). */
export function ProfesionalCard({ agenda, hoy, activo, onElegir }: ProfesionalCardProps) {
  const sinAgenda = agenda.fecha === null;
  return (
    <button
      type="button"
      aria-pressed={activo}
      disabled={sinAgenda}
      onClick={() => onElegir(agenda.profesionalId)}
      className={[
        "flex w-full flex-col gap-2 rounded-xl border-[1.5px] p-4 text-left text-ink",
        activo ? "border-clin bg-clin-soft" : "border-border bg-surface hover:border-clin",
        sinAgenda ? "opacity-60" : "",
      ].join(" ")}
    >
      <span className="flex w-full items-center justify-between gap-2">
        <span className="font-heading text-lg font-semibold">
          {etiquetaEspecialidad(agenda.especialidad)}
        </span>
        <span className="rounded-md bg-clin-soft px-2 py-[3px] font-mono text-xs font-medium text-clin-ink">
          {agenda.duracionTurnoMinutos} min
        </span>
      </span>
      <span className="text-ink-2">{nombreProfesional(agenda)}</span>
      <span className="text-[12.5px] text-ink-3">{textoProximaAgenda(agenda, hoy)}</span>
    </button>
  );
}
