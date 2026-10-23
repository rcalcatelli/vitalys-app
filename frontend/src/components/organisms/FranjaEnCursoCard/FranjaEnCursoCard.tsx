import { horaCorta } from "../../../utils/formato";

export interface FranjaEnCursoCardProps {
  inicio: string;
  fin: string;
  /** `false`: la franja todavía no empezó y es la próxima (su ventana de ingreso ya abrió). */
  enCurso: boolean;
  ingresaron: number;
  total: number;
}

/**
 * Organismo presentacional: franja de gimnasio que se está atendiendo en "Ingreso al gimnasio"
 * (horario, "N de M ingresaron", barra de progreso y la regla de cierre de RF-35).
 */
export function FranjaEnCursoCard({
  inicio,
  fin,
  enCurso,
  ingresaron,
  total,
}: FranjaEnCursoCardProps) {
  const porcentaje = total === 0 ? 0 : (ingresaron / total) * 100;
  return (
    <section
      aria-label={enCurso ? "Franja en curso" : "Próxima franja"}
      className="flex flex-col gap-3.5 rounded-xl border border-border bg-surface p-[18px]"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="flex items-center gap-2 text-xs font-semibold tracking-[0.06em] text-gym-ink uppercase">
            <span aria-hidden="true" className="h-2 w-2 rounded-full bg-gym" />
            {enCurso ? "Franja en curso" : "Próxima franja"}
          </span>
          <span className="font-mono text-[28px] font-semibold">
            {horaCorta(inicio)} – {horaCorta(fin)}
          </span>
        </div>
        <span className="font-heading text-xl font-semibold">
          {ingresaron} de {total} ingresaron
        </span>
      </div>
      <div
        role="progressbar"
        aria-label="Ingresos de la franja"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={ingresaron}
        className="h-2.5 overflow-hidden rounded-[5px] bg-surface-2"
      >
        <div
          className="h-full rounded-[5px] bg-gym transition-[width] duration-300"
          style={{ width: `${porcentaje}%` }}
        />
      </div>
      <span className="text-small text-pretty text-ink-2">
        A las <span className="font-mono">{horaCorta(fin)}</span>, al cerrar la franja, quienes no
        hayan ingresado pasan a <strong className="font-semibold text-bad-ink">Ausente</strong>.
      </span>
    </section>
  );
}
