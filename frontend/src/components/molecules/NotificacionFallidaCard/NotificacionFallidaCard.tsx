import type { NotificacionFallida } from "../../../types/notificacion";
import { fechaLarga, horaCorta } from "../../../utils/formato";
import { etiquetaTipoNotificacion } from "../../../utils/notificacionUi";
import { Chip } from "../../atoms/Chip";

interface Props {
  notificacion: NotificacionFallida;
}

/**
 * Molécula: una notificación fallida (DEFINITIVA → "Falló dos veces", HUERFANA → "Sin confirmar").
 * La reserva o la cancelación ya quedó registrada; lo que falló es el aviso al socio.
 */
export function NotificacionFallidaCard({ notificacion: n }: Props) {
  const definitiva = n.tipo === "DEFINITIVA";
  const momento = n.fecha && n.hora ? `${n.fecha}T${n.hora}-03:00` : null;
  const intentos = `${n.intentos} ${n.intentos === 1 ? "intento" : "intentos"}`;

  return (
    <article className="flex flex-wrap items-start gap-x-4 gap-y-3 rounded-xl border border-border bg-surface px-4 py-3.5">
      <div className="flex min-w-0 flex-[1_1_180px] flex-col gap-0.5">
        <span className="font-semibold text-ink">{n.pacienteNombre}</span>
        <span className="truncate text-caption text-ink-3">{n.pacienteEmail}</span>
      </div>

      <div className="flex min-w-0 flex-[1_1_220px] flex-col gap-[3px]">
        <span className="text-xs font-semibold text-ink-3">
          {etiquetaTipoNotificacion(n.tipoNotificacion)}
        </span>
        {n.profesionalNombre && <span className="text-sm text-ink">{n.profesionalNombre}</span>}
        {momento && (
          <span className="text-caption text-ink-2">
            {fechaLarga(momento)} · <span className="font-mono">{n.hora?.slice(0, 5)}</span>
          </span>
        )}
        {n.detalleError && <span className="text-caption text-bad-ink">{n.detalleError}</span>}
      </div>

      <div className="flex flex-[0_1_200px] flex-col items-start gap-1">
        <Chip tone={definitiva ? "bad" : "warn"} tamano="sm">
          {definitiva ? "Falló dos veces" : "Sin confirmar"}
        </Chip>
        <span className="font-mono text-caption text-ink-3">
          {intentos}
          {n.ultimoIntentoEn && ` · último ${horaCorta(n.ultimoIntentoEn)}`}
        </span>
        {!definitiva && (
          <span className="text-xs text-ink-3">Quedó pendiente por un reinicio del sistema</span>
        )}
      </div>
    </article>
  );
}
