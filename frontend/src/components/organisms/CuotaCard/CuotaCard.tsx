import type { EstadoCuenta } from "../../../types/pago";
import { resumenCuota } from "../../../utils/cuotaUi";
import { Chip } from "../../atoms/Chip";

export interface CuotaCardProps {
  /** `null` mientras carga o si la consulta falló (ver `error`). */
  estado: EstadoCuenta | null;
  error?: string | null;
  onReintentar: () => void;
  onVerEstado: () => void;
}

/** Tarjeta "Cuota del gimnasio" de Inicio: chip de estado, una línea y el atajo al estado de cuenta. */
export function CuotaCard({ estado, error = null, onReintentar, onVerEstado }: CuotaCardProps) {
  const resumen = estado ? resumenCuota(estado) : null;
  return (
    <div className="flex flex-[1_1_260px] flex-col gap-3 rounded-xl border border-border bg-surface p-5 shadow-card">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold tracking-[0.06em] text-ink-3 uppercase">
          Cuota del gimnasio
        </span>
        {resumen && (
          <Chip tone={resumen.tone} dot>
            {resumen.label}
          </Chip>
        )}
      </div>
      {resumen && <span className="text-[13.5px] text-pretty text-ink-2">{resumen.linea}</span>}
      {!resumen && !error && <span className="text-sm text-ink-3">Cargando cuota…</span>}
      {error && (
        <div role="alert" className="flex flex-col items-start gap-2 text-[13.5px] text-bad-ink">
          <span>No pudimos cargar tu cuota.</span>
          <button type="button" onClick={onReintentar} className="font-semibold underline">
            Reintentar
          </button>
        </div>
      )}
      <button
        type="button"
        onClick={onVerEstado}
        className="mt-auto h-10 self-start bg-transparent p-0 font-semibold text-clin-ink"
      >
        Ver estado de cuenta →
      </button>
    </div>
  );
}
