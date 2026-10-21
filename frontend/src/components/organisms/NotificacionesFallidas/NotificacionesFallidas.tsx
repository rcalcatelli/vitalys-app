import type { NotificacionFallida } from "../../../types/notificacion";
import { NotificacionFallidaCard } from "../../molecules/NotificacionFallidaCard";

interface Props {
  notificaciones: NotificacionFallida[];
}

/** Organismo presentacional: bloque "Notificaciones fallidas" de Hoy en el centro. */
export function NotificacionesFallidas({ notificaciones }: Props) {
  return (
    <section aria-labelledby="titulo-fallidas" className="flex flex-col gap-2.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 id="titulo-fallidas" className="font-heading text-[1.0625rem] font-semibold text-ink">
          Notificaciones fallidas
        </h2>
        <span className="text-[0.8125rem] text-ink-3">
          Los turnos ya están cancelados; lo que falló es el aviso al paciente.
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {notificaciones.map((n) => (
          <NotificacionFallidaCard key={n.id} notificacion={n} />
        ))}
        {notificaciones.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border-2 px-4 py-6 text-center text-ink-2">
            No hay notificaciones fallidas.
          </div>
        )}
      </div>

      {notificaciones.length > 0 && (
        <span className="text-[0.8125rem] text-ink-3">
          Avisale al paciente por teléfono o en recepción.
        </span>
      )}
    </section>
  );
}
