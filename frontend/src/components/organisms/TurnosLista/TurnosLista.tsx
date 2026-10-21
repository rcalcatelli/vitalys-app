import type { Profesional } from "../../../types/profesional";
import type { Turno } from "../../../types/turno";
import { horaBA } from "../../../utils/fechaBA";
import { describirTurno, diaCorto } from "../../../utils/turnoUi";
import { Button } from "../../atoms/Button";
import { EstadoChip } from "../../atoms/EstadoChip";

export interface TurnosListaProps {
  turnos: Turno[];
  profesionales: Profesional[];
  /** Instante actual inyectado: separa "Próximos" de "Historial". */
  ahora: Date;
  onCancelar: (turno: Turno) => void;
}

function Fila({
  turno,
  profesionales,
  puedeCancelar,
  onCancelar,
}: {
  turno: Turno;
  profesionales: Profesional[];
  puedeCancelar: boolean;
  onCancelar: (turno: Turno) => void;
}) {
  const { servicio, quien } = describirTurno(turno, profesionales);
  const esGym = turno.tipoTurno === "GYM";
  return (
    <li className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-border px-4 py-3 first:border-t-0">
      <div className="flex min-w-0 items-start gap-3">
        <span
          aria-hidden="true"
          className={`mt-1.5 size-2 shrink-0 rounded-full ${esGym ? "bg-gym" : "bg-clin"}`}
        />
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="font-semibold text-ink">{servicio}</span>
          {quien && <span className="text-sm text-ink-2">{quien}</span>}
          <span className="font-mono text-sm text-ink-2">
            {diaCorto(turno.inicio)} · {horaBA(turno.inicio)} – {horaBA(turno.fin)}
          </span>
          {turno.estado === "CANCELADO_POR_PROFESIONAL" && turno.motivoCancelacion && (
            <span className="text-sm text-ink-3">Motivo: {turno.motivoCancelacion}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <EstadoChip estado={turno.estado} />
        {puedeCancelar && (
          <Button
            type="button"
            variant="outline"
            aria-label={`Cancelar turno ${servicio} ${diaCorto(turno.inicio)} ${horaBA(turno.inicio)}`}
            onClick={() => onCancelar(turno)}
          >
            Cancelar
          </Button>
        )}
      </div>
    </li>
  );
}

function Grupo({
  titulo,
  nota,
  vacio,
  children,
}: {
  titulo: string;
  nota?: string;
  vacio: string;
  children: React.ReactNode[];
}) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex flex-col gap-0.5">
        <h2 className="font-heading text-lg font-semibold text-ink">{titulo}</h2>
        {nota && <p className="text-xs text-ink-3">{nota}</p>}
      </div>
      {children.length === 0 ? (
        <p className="text-sm text-ink-2">{vacio}</p>
      ) : (
        <ul className="overflow-hidden rounded-2xl border border-border bg-surface">{children}</ul>
      )}
    </section>
  );
}

/** Organismo presentacional: turnos del socio en "Próximos" (cancelables) e "Historial". */
export function TurnosLista({ turnos, profesionales, ahora, onCancelar }: TurnosListaProps) {
  const inicio = (t: Turno) => new Date(t.inicio).getTime();
  const esProximo = (t: Turno) => t.estado === "RESERVADO" && inicio(t) > ahora.getTime();
  const proximos = turnos.filter(esProximo).sort((a, b) => inicio(a) - inicio(b));
  const historial = turnos.filter((t) => !esProximo(t)).sort((a, b) => inicio(b) - inicio(a));

  return (
    <div className="flex flex-col gap-6">
      <Grupo
        titulo="Próximos"
        nota="En término: gimnasio hasta 2 h antes · consultorio hasta 24 h antes"
        vacio="No tenés turnos próximos."
      >
        {proximos.map((t) => (
          <Fila
            key={t.id}
            turno={t}
            profesionales={profesionales}
            puedeCancelar
            onCancelar={onCancelar}
          />
        ))}
      </Grupo>
      <Grupo titulo="Historial" vacio="Todavía no tenés turnos en el historial.">
        {historial.map((t) => (
          <Fila
            key={t.id}
            turno={t}
            profesionales={profesionales}
            puedeCancelar={false}
            onCancelar={onCancelar}
          />
        ))}
      </Grupo>
    </div>
  );
}
