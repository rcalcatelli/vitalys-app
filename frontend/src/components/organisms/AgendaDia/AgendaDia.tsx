import type { TurnoAgenda } from "../../../types/turno";
import { fechaBA, horaBA, minutosHasta } from "../../../utils/fechaBA";
import { fechaLargaDe } from "../../../utils/diasUi";
import { Button } from "../../atoms/Button";
import { EstadoChip } from "../../atoms/EstadoChip";

/** "Atendido" se habilita 15 min antes del inicio; "Ausente", desde el inicio. */
export const MINUTOS_ANTICIPO_ATENDIDO = 15;

export interface AgendaDiaProps {
  turnos: TurnoAgenda[];
  /** Instante actual inyectado: define qué botones están habilitados. */
  ahora: Date;
  /** Hoy (`YYYY-MM-DD`) para rotular el día. */
  hoy: string;
  /** Id del turno que se está marcando (deshabilita sus botones). */
  ocupadoId?: number | null;
  onAtendido: (turno: TurnoAgenda) => void;
  onAusente: (turno: TurnoAgenda) => void;
}

function ayuda(turno: TurnoAgenda, atendidoOk: boolean, ausenteOk: boolean): string | null {
  if (ausenteOk) return null;
  const anticipo = new Date(new Date(turno.inicio).getTime() - MINUTOS_ANTICIPO_ATENDIDO * 60000);
  if (!atendidoOk) {
    return `Atendido: disponible desde las ${horaBA(anticipo)} (15 min antes). Ausente: desde las ${horaBA(turno.inicio)} (inicio del turno).`;
  }
  return `Ausente: disponible desde las ${horaBA(turno.inicio)} (inicio del turno).`;
}

function Fila({
  turno,
  ahora,
  ocupado,
  onAtendido,
  onAusente,
}: {
  turno: TurnoAgenda;
  ahora: Date;
  ocupado: boolean;
  onAtendido: (turno: TurnoAgenda) => void;
  onAusente: (turno: TurnoAgenda) => void;
}) {
  const pendiente = turno.estado === "RESERVADO";
  const minutos = minutosHasta(turno.inicio, ahora);
  const atendidoOk = minutos <= MINUTOS_ANTICIPO_ATENDIDO;
  const ausenteOk = minutos <= 0;
  const textoAyuda = pendiente ? ayuda(turno, atendidoOk, ausenteOk) : null;

  return (
    <li className="flex flex-col gap-2 border-t border-border px-4 py-3 first:border-t-0">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="font-mono text-sm text-ink-2">
            {horaBA(turno.inicio)} – {horaBA(turno.fin)}
          </span>
          <span className="font-semibold text-ink">{turno.persona}</span>
          <span className="font-mono text-xs text-ink-3">DNI {turno.pacienteDni}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {pendiente ? (
            <>
              <Button
                type="button"
                variant="tonal-ok"
                disabled={!atendidoOk || ocupado}
                aria-label={`Atendido: ${turno.persona}`}
                onClick={() => onAtendido(turno)}
              >
                Atendido
              </Button>
              <Button
                type="button"
                variant="tonal-bad"
                disabled={!ausenteOk || ocupado}
                aria-label={`Ausente: ${turno.persona}`}
                onClick={() => onAusente(turno)}
              >
                Ausente
              </Button>
            </>
          ) : (
            <EstadoChip estado={turno.estado} vistaProfesional />
          )}
        </div>
      </div>
      {textoAyuda && <p className="text-xs text-ink-3">{textoAyuda}</p>}
    </li>
  );
}

/** Organismo presentacional: turnos del profesional agrupados por día, con Atendido / Ausente por ventana. */
export function AgendaDia({
  turnos,
  ahora,
  hoy,
  ocupadoId = null,
  onAtendido,
  onAusente,
}: AgendaDiaProps) {
  if (turnos.length === 0) {
    return <p className="text-sm text-ink-2">No tenés turnos en los próximos 7 días.</p>;
  }

  const porDia = new Map<string, TurnoAgenda[]>();
  for (const t of [...turnos].sort(
    (a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime(),
  )) {
    const dia = fechaBA(t.inicio);
    porDia.set(dia, [...(porDia.get(dia) ?? []), t]);
  }

  return (
    <div className="flex flex-col gap-6">
      {[...porDia.entries()].map(([dia, lista]) => (
        <section key={dia} aria-label={fechaLargaDe(dia)} className="flex flex-col gap-2">
          <h2 className="font-heading text-lg font-semibold text-ink">
            {fechaLargaDe(dia)}
            {dia === hoy ? " · hoy" : ""}
          </h2>
          <ul className="overflow-hidden rounded-2xl border border-border bg-surface">
            {lista.map((t) => (
              <Fila
                key={t.id}
                turno={t}
                ahora={ahora}
                ocupado={ocupadoId === t.id}
                onAtendido={onAtendido}
                onAusente={onAusente}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
