import { Spinner } from "../../atoms/Spinner";

export type CargandoVariante = "seccion" | "pantalla" | "linea";

export interface CargandoProps {
  /** Texto visible debajo (o al costado, en `linea`) del spinner. */
  texto?: string;
  /**
   * `seccion`: tarjeta con spinner md y texto de 13px donde todavía no llegó el contenido.
   * `pantalla`: spinner lg centrado en el área de contenido (no tapa la barra lateral ni la
   * navegación inferior); se usa al entrar a una pantalla, antes de tener cualquier dato.
   * `linea`: spinner sm y texto en una línea, sin tarjeta (dentro de diálogos y de otras tarjetas).
   */
  variante?: CargandoVariante;
  /** Alto mínimo en px de la `seccion` (120 por defecto; 220 para la grilla de horarios). */
  altoMin?: number;
  className?: string;
}

/**
 * Molécula: estado de carga con texto. `role="status"` + `aria-live="polite"`: el lector de
 * pantalla anuncia el texto sin interrumpir.
 */
export function Cargando({
  texto = "Cargando…",
  variante = "seccion",
  altoMin,
  className,
}: CargandoProps) {
  if (variante === "pantalla") {
    return (
      <div
        role="status"
        aria-live="polite"
        className={`flex min-h-[calc(100vh-180px)] flex-col items-center justify-center gap-3 text-[13px] text-ink-2 ${className ?? ""}`}
      >
        <Spinner tamano="lg" />
        <span>{texto}</span>
      </div>
    );
  }
  if (variante === "linea") {
    return (
      <div
        role="status"
        aria-live="polite"
        className={`flex items-center gap-2 text-[13px] text-ink-2 ${className ?? ""}`}
      >
        <Spinner tamano="sm" />
        <span>{texto}</span>
      </div>
    );
  }
  return (
    <div
      role="status"
      aria-live="polite"
      style={{ minHeight: altoMin ?? 120 }}
      className={`flex flex-col items-center justify-center gap-2.5 rounded-xl border border-border bg-surface px-4 py-5 text-center text-[13px] text-ink-2 ${className ?? ""}`}
    >
      <Spinner tamano="md" />
      <span>{texto}</span>
    </div>
  );
}
