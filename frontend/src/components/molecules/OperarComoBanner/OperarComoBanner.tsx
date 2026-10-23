export interface OperarComoBannerProps {
  /** Nombre del socio en cuyo nombre opera Recepción. */
  nombre: string;
  onVolver: () => void;
  /** Mientras se avisa al servidor que la sesión terminó. */
  ocupado?: boolean;
}

/**
 * Molécula: franja del shell durante "Operar como" (RF-39). Calco del mockup: fondo `warn-soft`,
 * texto `warn-ink` 13px, y el botón "Volver a Recepción" con borde del color del texto. La ve solo
 * quien opera (el ADMIN), no el socio.
 */
export function OperarComoBanner({ nombre, onVolver, ocupado = false }: OperarComoBannerProps) {
  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-warn-soft px-4 py-2.5 text-small text-warn-ink"
    >
      <span>
        <strong className="font-semibold">Recepción</strong> operando en nombre de{" "}
        <strong className="font-semibold">{nombre}</strong>. Todo lo que hagas queda registrado.
      </span>
      <button
        type="button"
        onClick={onVolver}
        disabled={ocupado}
        className="h-[34px] rounded-md border border-current bg-transparent px-3 text-small font-semibold text-inherit disabled:cursor-not-allowed disabled:opacity-60"
      >
        Volver a Recepción
      </button>
    </div>
  );
}
