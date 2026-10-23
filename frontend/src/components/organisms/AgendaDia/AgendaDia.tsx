import type { TurnoAgenda } from "../../../types/turno";
import { MINUTOS_ANTICIPO_ATENDIDO, type Hueco } from "../../../utils/agendaUi";
import { fechaLargaDe } from "../../../utils/diasUi";
import { estaCancelado } from "../../../utils/estadoTurno";
import { fechaBA, horaBA, minutosHasta } from "../../../utils/fechaBA";
import { Button } from "../../atoms/Button";
import { Chip } from "../../atoms/Chip";
import { EstadoChip } from "../../atoms/EstadoChip";

export { MINUTOS_ANTICIPO_ATENDIDO };

export interface AgendaDiaProps {
  turnos: TurnoAgenda[];
  /** Instante actual inyectado: define qué botones están habilitados y cuál es el turno en curso. */
  ahora: Date;
  /** Hoy (`YYYY-MM-DD`): el día de hoy lleva el resumen y los huecos; los demás, solo los turnos. */
  hoy: string;
  /** Huecos libres de hoy (disponibilidad menos turnos); vacío si no se pudo leer la disponibilidad. */
  huecos?: Hueco[];
  /** Minutos por consulta del profesional; `null` si no se pudo leer su perfil. */
  duracionTurnoMinutos?: number | null;
  /** Id del turno que se está marcando (deshabilita sus botones). */
  ocupadoId?: number | null;
  onAtendido: (turno: TurnoAgenda) => void;
  onAusente: (turno: TurnoAgenda) => void;
}

const FILA = "flex flex-wrap items-center gap-x-4 gap-y-3 rounded-lg border px-3.5 py-3";

function ayuda(turno: TurnoAgenda, atendidoOk: boolean, ausenteOk: boolean): string | null {
  if (ausenteOk) return null;
  const anticipo = new Date(new Date(turno.inicio).getTime() - MINUTOS_ANTICIPO_ATENDIDO * 60000);
  if (!atendidoOk) {
    return `Atendido: disponible desde las ${horaBA(anticipo)} (${MINUTOS_ANTICIPO_ATENDIDO} min antes). Ausente: desde las ${horaBA(turno.inicio)} (inicio del turno).`;
  }
  return `Ausente: disponible desde las ${horaBA(turno.inicio)} (inicio del turno).`;
}

function Horario({ inicio, fin }: { inicio: string; fin: string }) {
  return (
    <div className="flex w-[58px] shrink-0 flex-col">
      <span className="font-mono text-base font-semibold text-ink">{horaBA(inicio)}</span>
      <span className="font-mono text-[11.5px] text-ink-3">{horaBA(fin)}</span>
    </div>
  );
}

function FilaHueco({ hueco, ahora }: { hueco: Hueco; ahora: Date }) {
  const pasado = new Date(hueco.fin).getTime() <= ahora.getTime();
  return (
    <li className={`${FILA} border-dashed border-border-2 ${pasado ? "opacity-60" : ""}`}>
      <Horario inicio={hueco.inicio} fin={hueco.fin} />
      <span className="flex-[1_1_160px] text-ink-3">
        {pasado ? "Hueco libre (pasado)" : "Libre"}
      </span>
    </li>
  );
}

function FilaTurno({
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
  const enCurso = minutos <= 0 && new Date(turno.fin).getTime() > ahora.getTime();
  const textoAyuda = pendiente ? ayuda(turno, atendidoOk, ausenteOk) : null;

  return (
    <li
      className={`${FILA} ${enCurso ? "border-clin bg-clin-soft" : "border-border bg-surface"}`}
      aria-current={enCurso && pendiente ? "time" : undefined}
    >
      <Horario inicio={turno.inicio} fin={turno.fin} />
      <div className="flex min-w-0 flex-[1_1_160px] flex-col gap-0.5">
        <span className="font-semibold text-ink">{turno.persona}</span>
        <span className="text-[12.5px] text-ink-3">
          DNI <span className="font-mono">{turno.pacienteDni}</span>
        </span>
      </div>
      <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
        {pendiente && enCurso && (
          <Chip tone="clin" dot>
            En curso
          </Chip>
        )}
        {pendiente ? (
          <>
            <Button
              type="button"
              variant="tonal-ok"
              size="tabla"
              className="disabled:opacity-45!"
              disabled={!atendidoOk || ocupado}
              aria-label={`Atendido: ${turno.persona}`}
              onClick={() => onAtendido(turno)}
            >
              Atendido
            </Button>
            <Button
              type="button"
              variant="tonal-bad"
              size="tabla"
              className="disabled:opacity-45!"
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
        {textoAyuda && (
          <p className="basis-full text-right text-[12.5px] text-ink-3">{textoAyuda}</p>
        )}
      </div>
    </li>
  );
}

function Resumen({ valor, etiqueta }: { valor: string | number; etiqueta: string }) {
  return (
    <span className="flex items-baseline gap-1.5 rounded-[10px] border border-border bg-surface px-3 py-2">
      <span className="font-heading text-lg font-semibold text-ink">{valor}</span>
      <span className="text-[12.5px] text-ink-2">{etiqueta}</span>
    </span>
  );
}

/**
 * Organismo presentacional: la agenda del profesional. Hoy lleva el resumen (pacientes, huecos
 * libres, atendidos, minutos por consulta) y mezcla los turnos con los huecos libres, resaltando el
 * turno en curso; los días siguientes listan solo los turnos. "Atendido" se habilita 15 min antes
 * del inicio y "Ausente" desde el inicio (regla del backend).
 */
export function AgendaDia({
  turnos,
  ahora,
  hoy,
  huecos = [],
  duracionTurnoMinutos = null,
  ocupadoId = null,
  onAtendido,
  onAusente,
}: AgendaDiaProps) {
  const vigentes = turnos.filter((t) => !estaCancelado(t.estado));
  const porDia = new Map<string, TurnoAgenda[]>();
  for (const t of [...vigentes].sort(
    (a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime(),
  )) {
    const dia = fechaBA(t.inicio);
    porDia.set(dia, [...(porDia.get(dia) ?? []), t]);
  }

  const deHoy = porDia.get(hoy) ?? [];
  const otros = [...porDia.entries()].filter(([dia]) => dia !== hoy);
  if (deHoy.length === 0 && huecos.length === 0 && otros.length === 0) {
    return <p className="text-sm text-ink-2">No tenés turnos en los próximos 7 días.</p>;
  }

  type Item = { inicio: string; nodo: React.ReactNode };
  const items: Item[] = [
    ...deHoy.map((t) => ({
      inicio: t.inicio,
      nodo: (
        <FilaTurno
          key={`t${t.id}`}
          turno={t}
          ahora={ahora}
          ocupado={ocupadoId === t.id}
          onAtendido={onAtendido}
          onAusente={onAusente}
        />
      ),
    })),
    ...huecos.map((h) => ({
      inicio: h.inicio,
      nodo: <FilaHueco key={`h${h.inicio}`} hueco={h} ahora={ahora} />,
    })),
  ].sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime());

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <Resumen valor={deHoy.length} etiqueta="pacientes" />
        {duracionTurnoMinutos !== null && (
          <Resumen valor={huecos.length} etiqueta="huecos libres" />
        )}
        <Resumen
          valor={deHoy.filter((t) => t.estado === "COMPLETADO").length}
          etiqueta="atendidos"
        />
        {duracionTurnoMinutos !== null && (
          <Resumen valor={`${duracionTurnoMinutos} min`} etiqueta="por consulta" />
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-ink-2">No tenés turnos hoy.</p>
      ) : (
        <ul aria-label="Hoy" className="flex flex-col gap-2">
          {items.map((i) => i.nodo)}
        </ul>
      )}

      {otros.map(([dia, lista]) => (
        <section key={dia} aria-label={fechaLargaDe(dia)} className="flex flex-col gap-2">
          <h2 className="font-heading text-lg font-semibold text-ink">{fechaLargaDe(dia)}</h2>
          <ul className="flex flex-col gap-2">
            {lista.map((t) => (
              <FilaTurno
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
