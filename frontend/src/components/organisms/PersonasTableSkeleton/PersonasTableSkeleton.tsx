import { Skeleton } from "../../atoms/Skeleton";

const COLUMNAS = "grid-cols-[1.5fr_1fr_1.7fr_1.4fr_120px]";

function FilaMobile() {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 border-t border-border px-4 py-3 shell:hidden">
      <span className="flex flex-col gap-1.5">
        <Skeleton ancho="58%" alto={14} />
        <Skeleton ancho="78%" alto={10} />
      </span>
      <span className="justify-self-end">
        <Skeleton ancho={72} alto={14} />
      </span>
      <span className="flex gap-1">
        <Skeleton ancho={64} alto={20} />
        <Skeleton ancho={72} alto={20} />
      </span>
      <span className="justify-self-end">
        <Skeleton ancho={88} alto={22} radio={999} />
      </span>
      <span className="col-[1/-1] justify-self-end">
        <Skeleton ancho={104} alto={38} radio={8} />
      </span>
    </div>
  );
}

function FilaDesktop() {
  return (
    <div
      className={`hidden min-h-[63px] items-center gap-3 border-t border-border px-4 py-3 shell:grid ${COLUMNAS}`}
    >
      <span className="flex flex-col gap-1.5">
        <Skeleton ancho="62%" alto={14} />
        <Skeleton ancho="80%" alto={10} />
      </span>
      <Skeleton ancho="70%" alto={14} />
      <span className="flex gap-1">
        <Skeleton ancho={64} alto={20} />
        <Skeleton ancho={72} alto={20} />
      </span>
      <Skeleton ancho={92} alto={22} radio={999} />
      <span className="justify-self-end">
        <Skeleton ancho={104} alto={38} radio={8} />
      </span>
    </div>
  );
}

/**
 * Organismo: skeleton del listado de Personas mientras llega la lista. Mismas alturas que las
 * filas reales (5 filas en tabla desde 760px, 3 tarjetas en mobile). `role="status"` con texto
 * oculto.
 */
export function PersonasTableSkeleton() {
  return (
    <div role="status">
      <span className="sr-only">Cargando personas…</span>
      <div
        aria-hidden="true"
        className="overflow-hidden rounded-xl border border-border bg-surface"
      >
        <div
          className={`hidden gap-3 bg-surface-2 px-4 py-2.5 text-xs font-semibold tracking-[0.05em] text-ink-3 uppercase shell:grid ${COLUMNAS}`}
        >
          <span>Nombre</span>
          <span>DNI</span>
          <span>Servicios</span>
          <span>Cuota</span>
          <span />
        </div>
        {[0, 1, 2].map((i) => (
          <FilaMobile key={`m${i}`} />
        ))}
        {[0, 1, 2, 3, 4].map((i) => (
          <FilaDesktop key={`d${i}`} />
        ))}
      </div>
    </div>
  );
}
