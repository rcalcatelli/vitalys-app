import type { Profesional } from "../../../types/profesional";
import type { Turno } from "../../../types/turno";
import { fechaRelativa, nombreDia, nombreMes, numeroDia } from "../../../utils/diasUi";
import { fechaBA, horaBA, hoyBA } from "../../../utils/fechaBA";
import { marcaRecepcion, servicioDeTurno } from "../../../utils/turnoUi";
import { Button } from "../../atoms/Button";

export interface ProximoTurnoCardProps {
  /** El próximo turno reservado; `null` si no tiene ninguno. */
  turno: Turno | null;
  profesionales: Profesional[];
  ahora: Date;
  onVerTurnos: () => void;
  onCancelar: (turno: Turno) => void;
}

/**
 * Tarjeta "Tu próximo turno" de Inicio: bloque de fecha con el color del servicio (naranja gimnasio,
 * teal consultorio), servicio, horario y quién atiende. Sin turno, tarjeta punteada.
 */
export function ProximoTurnoCard({
  turno,
  profesionales,
  ahora,
  onVerTurnos,
  onCancelar,
}: ProximoTurnoCardProps) {
  if (!turno) {
    return (
      <div className="flex flex-[2_1_400px] flex-col justify-center gap-2 rounded-xl border border-dashed border-border-2 bg-surface p-6">
        <span className="font-heading text-xl font-semibold text-ink">
          No tenés turnos próximos
        </span>
        <span className="text-ink-2">
          Reservá el gimnasio o pedí una consulta con los accesos de abajo.
        </span>
      </div>
    );
  }

  const fecha = fechaBA(turno.inicio);
  const esGym = turno.tipoTurno === "GYM";
  const { servicio, quien } = servicioDeTurno(turno, profesionales);
  const marca = marcaRecepcion(turno);
  const soft = esGym ? "bg-gym-soft text-gym-ink" : "bg-clin-soft text-clin-ink";

  return (
    <div className="flex flex-[2_1_400px] flex-col gap-4 rounded-xl border border-border bg-surface p-5 shadow-card">
      <div className="text-xs font-semibold tracking-[0.06em] text-ink-3 uppercase">
        {`Tu próximo turno · ${fechaRelativa(fecha, hoyBA(ahora))}`}
      </div>
      <div className="flex items-center gap-[18px]">
        <div
          className={`flex w-24 shrink-0 flex-col items-center rounded-lg px-0 pt-3 pb-3.5 text-center ${soft}`}
        >
          <span className="text-xs font-semibold tracking-[0.06em] uppercase">
            {nombreDia(fecha)}
          </span>
          <span className="my-1 font-heading text-5xl leading-none font-semibold">
            {numeroDia(fecha)}
          </span>
          <span className="text-[13px] font-medium">{nombreMes(fecha)}</span>
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <span
            className={`inline-flex items-center gap-1.5 self-start rounded-full px-2.5 py-[3px] text-xs font-semibold ${soft}`}
          >
            <span
              aria-hidden="true"
              className={`size-[7px] rounded-[2px] ${esGym ? "bg-gym" : "bg-clin"}`}
            />
            {esGym ? "Gimnasio" : "Consultorio"}
          </span>
          <span className="font-heading text-[22px] leading-[1.15] font-semibold text-ink">
            {esGym ? "Gimnasio" : `Consulta de ${servicio}`}
          </span>
          <span className="font-mono text-[17px] font-medium text-ink">
            {horaBA(turno.inicio)} – {horaBA(turno.fin)}
          </span>
          <span className="text-[13.5px] text-ink-2">{quien}</span>
          {marca && <span className="text-xs text-ink-3">{marca}</span>}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="neutral" onClick={onVerTurnos}>
          Ver mis turnos
        </Button>
        <Button type="button" variant="ghost-bad" onClick={() => onCancelar(turno)}>
          Cancelar turno
        </Button>
      </div>
    </div>
  );
}
