import type { ReactNode } from "react";

export interface TablaProps {
  /** `grid-template-columns` compartido por cabecera y filas (p.ej. `"1.5fr 1fr 120px"`). */
  columnas: string;
  encabezados: string[];
  etiqueta: string;
  children: ReactNode;
}

/**
 * Molécula: tabla del mockup — tarjeta con cabecera `surface-2` en mayúsculas chicas y filas en
 * grilla CSS (no `<table>`: en mobile las filas cambian de forma). Las filas son `FilaTabla`.
 */
export function Tabla({ columnas, encabezados, etiqueta, children }: TablaProps) {
  return (
    <div
      role="table"
      aria-label={etiqueta}
      className="overflow-hidden rounded-xl border border-border bg-surface shadow-card"
    >
      <div
        role="row"
        style={{ gridTemplateColumns: columnas }}
        className="grid gap-3 bg-surface-2 px-4 py-2.5 text-xs font-semibold tracking-[0.05em] text-ink-3 uppercase"
      >
        {encabezados.map((h) => (
          <span key={h} role="columnheader">
            {h}
          </span>
        ))}
      </div>
      {children}
    </div>
  );
}

export interface FilaTablaProps {
  columnas: string;
  children: ReactNode;
}

/** Fila de `Tabla`: misma grilla que la cabecera, separador superior. */
export function FilaTabla({ columnas, children }: FilaTablaProps) {
  return (
    <div
      role="row"
      style={{ gridTemplateColumns: columnas }}
      className="grid items-center gap-3 border-t border-border px-4 py-3"
    >
      {children}
    </div>
  );
}
