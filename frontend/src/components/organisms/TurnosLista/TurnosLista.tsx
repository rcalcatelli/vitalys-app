import type { Profesional } from "../../../types/profesional";
import type { Turno } from "../../../types/turno";
import { fechaDiaMes } from "../../../utils/diasUi";
import { fechaBA, horaBA } from "../../../utils/fechaBA";
import { describirTurno, diaCorto, marcaRecepcion, servicioDeTurno } from "../../../utils/turnoUi";
import { Button } from "../../atoms/Button";
import { EstadoChip } from "../../atoms/EstadoChip";

export interface TurnosListaProps {
  turnos: Turno[];
  profesionales: Profesional[];
  /** Instante actual inyectado: separa "Próximos" de "Historial". */
  ahora: Date;
  onCancelar: (turno: Turno) => void;
}

// En mobile cada turno es una tarjeta de dos columnas; desde 760px, la tabla del diseño.
const COLUMNAS = "grid-cols-[minmax(0,1fr)_auto] shell:grid-cols-[1.1fr_0.9fr_1.8fr_1.5fr_110px]";

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
  const { servicio, quien } = servicioDeTurno(turno, profesionales);
  const esGym = turno.tipoTurno === "GYM";
  const marca = marcaRecepcion(turno);
  return (
    <li
      className={`grid items-center gap-x-3 gap-y-1.5 border-t border-border px-4 py-3 shell:gap-y-3 ${COLUMNAS}`}
    >
      <span className="font-medium text-ink">{fechaDiaMes(fechaBA(turno.inicio))}</span>
      <span className="text-right font-mono text-[13px] text-ink-2 shell:text-left">
        {horaBA(turno.inicio)} – {horaBA(turno.fin)}
      </span>
      <span className="flex min-w-0 items-center gap-2">
        <span
          aria-hidden="true"
          className={`size-2 shrink-0 rounded-[2px] ${esGym ? "bg-gym" : "bg-clin"}`}
        />
        <span className="flex min-w-0 flex-col">
          <span className="text-ink">{servicio}</span>
          <span className="text-xs text-ink-3">{quien}</span>
          {turno.estado === "CANCELADO_POR_PROFESIONAL" && turno.motivoCancelacion && (
            <span className="text-xs text-ink-3">Motivo: {turno.motivoCancelacion}</span>
          )}
        </span>
      </span>
      <span className="flex flex-col items-start gap-1 justify-self-start">
        <EstadoChip estado={turno.estado} />
        {marca && <span className="text-xs text-ink-3">{marca}</span>}
      </span>
      <span className="col-start-2 justify-self-end shell:col-auto">
        {puedeCancelar && (
          <Button
            type="button"
            variant="outline-bad"
            size="tabla"
            aria-label={`Cancelar turno ${describirTurno(turno, profesionales).servicio} ${diaCorto(turno.inicio)} ${horaBA(turno.inicio)}`}
            onClick={() => onCancelar(turno)}
          >
            Cancelar
          </Button>
        )}
      </span>
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
    <section className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-heading text-[17px] font-semibold text-ink">{titulo}</h2>
        {nota && <p className="text-[12.5px] text-ink-3">{nota}</p>}
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <div
          aria-hidden="true"
          className={`hidden gap-3 bg-surface-2 px-4 py-2.5 text-xs font-semibold tracking-[0.05em] text-ink-3 uppercase shell:grid ${COLUMNAS}`}
        >
          <span>Fecha</span>
          <span>Hora</span>
          <span>Servicio</span>
          <span>Estado</span>
          <span />
        </div>
        {children.length === 0 ? (
          <p className="border-t border-border px-4 py-5 text-ink-3">{vacio}</p>
        ) : (
          <ul>{children}</ul>
        )}
      </div>
    </section>
  );
}

/** Organismo presentacional: turnos del socio en "Próximos" (cancelables) e "Historial", en tabla. */
export function TurnosLista({ turnos, profesionales, ahora, onCancelar }: TurnosListaProps) {
  const inicio = (t: Turno) => new Date(t.inicio).getTime();
  const esProximo = (t: Turno) => t.estado === "RESERVADO" && inicio(t) > ahora.getTime();
  const proximos = turnos.filter(esProximo).sort((a, b) => inicio(a) - inicio(b));
  const historial = turnos.filter((t) => !esProximo(t)).sort((a, b) => inicio(b) - inicio(a));

  return (
    <div className="flex flex-col gap-[22px]">
      <Grupo
        titulo="Próximos"
        nota="En término: gimnasio hasta 2 h antes · consultorio hasta 24 h antes"
        vacio="No hay turnos."
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
      <Grupo titulo="Historial" vacio="No hay turnos.">
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
