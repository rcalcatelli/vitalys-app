export interface FiltroPildorasProps<T extends string> {
  /** Nombre accesible del grupo ("Filtrar personas"). */
  etiqueta: string;
  opciones: readonly (readonly [T, string])[];
  valor: T;
  onChange: (valor: T) => void;
}

/**
 * Molécula: fila de filtros en píldora del mockup (36px, 13px; la activa invierte `ink`/`bg`).
 * Se desplaza en horizontal cuando no entra en mobile.
 */
export function FiltroPildoras<T extends string>({
  etiqueta,
  opciones,
  valor,
  onChange,
}: FiltroPildorasProps<T>) {
  return (
    <div className="flex gap-1.5 overflow-x-auto" role="group" aria-label={etiqueta}>
      {opciones.map(([clave, texto]) => {
        const activo = valor === clave;
        return (
          <button
            key={clave}
            type="button"
            aria-pressed={activo}
            onClick={() => onChange(clave)}
            className={[
              "h-9 rounded-full border px-3.5 text-small font-medium whitespace-nowrap",
              activo ? "border-ink bg-ink text-bg" : "border-border bg-surface text-ink-2",
            ].join(" ")}
          >
            {texto}
          </button>
        );
      })}
    </div>
  );
}
