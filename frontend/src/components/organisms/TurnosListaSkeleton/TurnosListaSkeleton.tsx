import { Skeleton } from "../../atoms/Skeleton";

const COLUMNAS = "grid-cols-[1.1fr_0.9fr_1.8fr_1.5fr_110px]";

function FilaMobile() {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 border-t border-border px-4 py-3 shell:hidden">
      <Skeleton ancho="46%" alto={14} />
      <span className="justify-self-end">
        <Skeleton ancho={92} alto={14} />
      </span>
      <span className="flex items-center gap-2">
        <Skeleton ancho={8} alto={8} radio={2} />
        <span className="flex flex-1 flex-col gap-1.5">
          <Skeleton ancho="55%" alto={14} />
          <Skeleton ancho="75%" alto={10} />
        </span>
      </span>
      <span className="justify-self-end">
        <Skeleton ancho={88} alto={22} radio={999} />
      </span>
      <span className="col-start-2 justify-self-end">
        <Skeleton ancho={84} alto={40} radio={8} />
      </span>
    </div>
  );
}

function FilaDesktop() {
  return (
    <div
      className={`hidden min-h-[65px] items-center gap-3 border-t border-border px-4 py-3 shell:grid ${COLUMNAS}`}
    >
      <Skeleton ancho="72%" alto={14} />
      <Skeleton ancho="80%" alto={14} />
      <span className="flex items-center gap-2">
        <Skeleton ancho={8} alto={8} radio={2} />
        <span className="flex flex-1 flex-col gap-1.5">
          <Skeleton ancho="60%" alto={14} />
          <Skeleton ancho="85%" alto={10} />
        </span>
      </span>
      <Skeleton ancho={96} alto={22} radio={999} />
      <span className="justify-self-end">
        <Skeleton ancho={86} alto={40} radio={8} />
      </span>
    </div>
  );
}

/**
 * Organismo: skeleton de "Mis turnos" mientras llegan los turnos. Mismas alturas que las filas
 * reales (4 filas en tabla desde 760px, 3 tarjetas en mobile). `role="status"` con texto oculto.
 */
export function TurnosListaSkeleton() {
  return (
    <div role="status" className="flex flex-col gap-2.5">
      <span className="sr-only">Cargando tus turnos…</span>
      <div aria-hidden="true" className="flex min-h-[25px] items-center justify-between gap-2">
        <Skeleton ancho={96} alto={18} />
        <Skeleton ancho="34%" alto={12} />
      </div>
      <div
        aria-hidden="true"
        className="overflow-hidden rounded-xl border border-border bg-surface"
      >
        <div
          className={`hidden gap-3 bg-surface-2 px-4 py-2.5 text-xs font-semibold tracking-[0.05em] text-ink-3 uppercase shell:grid ${COLUMNAS}`}
        >
          <span>Fecha</span>
          <span>Hora</span>
          <span>Servicio</span>
          <span>Estado</span>
          <span />
        </div>
        {[0, 1, 2].map((i) => (
          <FilaMobile key={`m${i}`} />
        ))}
        {[0, 1, 2, 3].map((i) => (
          <FilaDesktop key={`d${i}`} />
        ))}
      </div>
    </div>
  );
}
