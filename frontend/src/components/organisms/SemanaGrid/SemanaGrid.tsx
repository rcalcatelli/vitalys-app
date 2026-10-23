import type { FranjaEditable } from "../../../types/disponibilidad";
import {
  HORA_FIN_GRILLA,
  HORA_INICIO_GRILLA,
  aMinutos,
  diasVisibles,
  nombreDiaCorto,
} from "../../../utils/disponibilidad";

export interface SemanaGridProps {
  filas: FranjaEditable[];
  errores: Record<string, string>;
  duracionTurnoMinutos: number;
}

const PX_POR_HORA = 30;
const INICIO_MIN = HORA_INICIO_GRILLA * 60;
const FIN_MIN = HORA_FIN_GRILLA * 60;
const HORAS = Array.from({ length: HORA_FIN_GRILLA - HORA_INICIO_GRILLA }, (_, i) =>
  String(HORA_INICIO_GRILLA + i).padStart(2, "0"),
);

/**
 * Vista semanal de las franjas del borrador (calco de la grilla del mockup): una columna por
 * día y un bloque por franja, en rojo si esa franja tiene un error. Es decorativa para quien
 * ve con lectores de pantalla (el editor ya expone los mismos datos), por eso va `aria-hidden`
 * en la grilla y el resumen queda en el encabezado.
 */
export function SemanaGrid({ filas, errores, duracionTurnoMinutos }: SemanaGridProps) {
  const dias = diasVisibles(filas);
  const columnas = `2.5rem repeat(${dias.length}, minmax(52px, 1fr))`;

  return (
    <section
      aria-label="Semana"
      className="flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-surface p-4 lg:flex-[2_1_420px]"
    >
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-heading text-[17px] font-semibold text-ink">Semana</h2>
        <span className="text-[12.5px] text-ink-3">Consultas de {duracionTurnoMinutos} min</span>
      </div>
      <div className="overflow-x-auto" aria-hidden="true">
        <div className="grid min-w-[360px] gap-1" style={{ gridTemplateColumns: columnas }}>
          <span />
          {dias.map((d) => (
            <span key={d} className="pb-1 text-center text-xs font-semibold text-ink-2">
              {nombreDiaCorto(d)}
            </span>
          ))}
          <div className="flex flex-col">
            {HORAS.map((h) => (
              <span
                key={h}
                className="h-[30px] -translate-y-1.5 font-mono text-[10.5px] text-ink-3"
              >
                {h}
              </span>
            ))}
          </div>
          {dias.map((d) => (
            <div
              key={d}
              data-testid={`dia-${d}`}
              className="relative h-[420px] rounded-md bg-surface-2"
              style={{
                backgroundImage: `repeating-linear-gradient(to bottom, var(--border) 0 1px, transparent 1px ${PX_POR_HORA}px)`,
              }}
            >
              {filas
                .filter((f) => f.diaSemana === d && aMinutos(f.horaFin) > aMinutos(f.horaInicio))
                .map((f) => {
                  const hayError = Boolean(errores[f.clave]);
                  const desde = Math.max(0, aMinutos(f.horaInicio) - INICIO_MIN);
                  const hasta = Math.min(FIN_MIN - INICIO_MIN, aMinutos(f.horaFin) - INICIO_MIN);
                  return (
                    <div
                      key={f.clave}
                      data-testid="bloque"
                      className={[
                        "absolute right-[3px] left-[3px] overflow-hidden rounded-md border-[1.5px] px-1.5 py-1 font-mono text-[10.5px] leading-tight font-semibold",
                        hayError
                          ? "border-bad bg-bad-soft text-bad-ink"
                          : "border-clin bg-clin-soft text-clin-ink",
                      ].join(" ")}
                      style={{
                        top: `${(desde / 60) * PX_POR_HORA}px`,
                        height: `${((hasta - desde) / 60) * PX_POR_HORA}px`,
                      }}
                    >
                      {f.horaInicio}
                      <br />
                      {f.horaFin}
                    </div>
                  );
                })}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
