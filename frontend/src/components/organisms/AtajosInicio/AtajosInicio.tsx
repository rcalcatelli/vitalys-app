import type { EstadoGym } from "../../../types/turno";

export interface AtajosInicioProps {
  /** `null` mientras carga o si falló: el atajo de gimnasio queda activo y la reserva valida igual. */
  estadoGym: EstadoGym | null;
  onGimnasio: () => void;
  onConsultorio: () => void;
}

const BASE =
  "flex flex-col gap-2 rounded-xl border border-border bg-surface p-[18px] text-left text-ink";

function textoGimnasio(estado: EstadoGym | null): string {
  if (estado && !estado.esSocioGym) return "No tenés el servicio de gimnasio activo.";
  if (estado?.suspendido) {
    return "Reserva suspendida por períodos impagos: regularizá en recepción.";
  }
  return "Franjas de 60 min · hasta 7 días antes.";
}

/**
 * Atajos de Inicio: "Reservar gimnasio" (al 50% y sin acción si no es socio o está suspendido; la
 * excepción vigente ya viene descontada en `suspendido`) y "Pedir consulta", siempre activo (RN-01).
 */
export function AtajosInicio({ estadoGym, onGimnasio, onConsultorio }: AtajosInicioProps) {
  const sinGimnasio = estadoGym !== null && (!estadoGym.esSocioGym || estadoGym.suspendido);
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,280px),1fr))] gap-3">
      <button
        type="button"
        disabled={sinGimnasio}
        onClick={onGimnasio}
        className={`${BASE} ${sinGimnasio ? "opacity-50" : "hover:border-gym"}`}
      >
        <span className="flex w-full items-center justify-between">
          <span className="flex items-center gap-2 font-heading text-lg font-semibold">
            <span aria-hidden="true" className="size-2.5 rounded-[3px] bg-gym" />
            Reservar gimnasio
          </span>
          <span aria-hidden="true" className="text-xl text-gym-ink">
            →
          </span>
        </span>
        <span className="text-[13.5px] text-ink-2">{textoGimnasio(estadoGym)}</span>
      </button>
      <button type="button" onClick={onConsultorio} className={`${BASE} hover:border-clin`}>
        <span className="flex w-full items-center justify-between">
          <span className="flex items-center gap-2 font-heading text-lg font-semibold">
            <span aria-hidden="true" className="size-2.5 rounded-[3px] bg-clin" />
            Pedir consulta
          </span>
          <span aria-hidden="true" className="text-xl text-clin-ink">
            →
          </span>
        </span>
        <span className="text-[13.5px] text-ink-2">Nutrición, Psicología o Kinesiología.</span>
      </button>
    </div>
  );
}
