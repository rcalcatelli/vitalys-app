import type { Turno } from "../../../types/turno";
import { abreviaturaDia, numeroDia } from "../../../utils/diasUi";
import { estaCancelado } from "../../../utils/estadoTurno";
import { diaSemana, fechaBA, horaBA, hoyBA, sumarDias } from "../../../utils/fechaBA";

export interface SemanaSocioProps {
  turnos: Turno[];
  ahora: Date;
}

/** Lunes a domingo de la semana de `hoy`. */
function semanaDe(hoy: string): string[] {
  const lunes = sumarDias(hoy, -(diaSemana(hoy) - 1));
  return Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i));
}

/** "Tu semana": lunes a domingo con los horarios de cada turno (gimnasio naranja, consultorio teal). */
export function SemanaSocio({ turnos, ahora }: SemanaSocioProps) {
  const hoy = hoyBA(ahora);
  const dias = semanaDe(hoy);
  const enSemana = turnos.filter((t) => dias.includes(fechaBA(t.inicio)));
  const porDelante = enSemana.filter(
    (t) => t.estado === "RESERVADO" && new Date(t.inicio).getTime() > ahora.getTime(),
  ).length;
  const completados = enSemana.filter((t) => t.estado === "COMPLETADO").length;
  const resumen = `${porDelante} ${porDelante === 1 ? "turno por delante" : "turnos por delante"} · ${completados} ${completados === 1 ? "completado" : "completados"}`;

  return (
    <section
      aria-label="Tu semana"
      className="flex flex-col gap-3.5 rounded-xl border border-border bg-surface p-[18px] shadow-card"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-1.5">
        <h2 className="font-heading text-[17px] font-semibold text-ink">Tu semana</h2>
        <span className="text-[13px] text-ink-3">{resumen}</span>
      </div>
      <ul className="grid grid-cols-7 gap-1.5">
        {dias.map((d) => {
          const esHoy = d === hoy;
          const items = enSemana
            .filter((t) => fechaBA(t.inicio) === d && !estaCancelado(t.estado))
            .sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime());
          return (
            <li
              key={d}
              aria-current={esHoy ? "date" : undefined}
              className={[
                "flex min-h-24 flex-col items-center gap-1.5 rounded-[10px] border px-0.5 pt-2 pb-2.5",
                esHoy ? "border-clin bg-clin-soft" : "border-border bg-transparent",
              ].join(" ")}
            >
              <span className="text-[11px] font-semibold text-ink-3 uppercase">
                {abreviaturaDia(d)}
              </span>
              <span
                className={[
                  "font-heading text-[17px] font-semibold",
                  esHoy ? "text-clin-ink" : d < hoy ? "text-ink-3" : "text-ink",
                ].join(" ")}
              >
                {numeroDia(d)}
              </span>
              {items.map((t) => (
                <span
                  key={t.id}
                  className={[
                    "rounded-[4px] px-1 py-0.5 font-mono text-[10.5px] font-medium",
                    t.tipoTurno === "GYM"
                      ? "bg-gym-soft text-gym-ink"
                      : "bg-clin-soft text-clin-ink",
                    t.estado === "AUSENTE" ? "line-through" : "",
                  ].join(" ")}
                >
                  {horaBA(t.inicio)}
                </span>
              ))}
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap gap-3.5 text-xs text-ink-3">
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="size-2 rounded-[2px] bg-gym" />
          Gimnasio
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="size-2 rounded-[2px] bg-clin" />
          Consultorio
        </span>
      </div>
    </section>
  );
}
