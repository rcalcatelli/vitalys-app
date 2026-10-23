import type { CSSProperties } from "react";

export interface SkeletonProps {
  /** Ancho: número (px) o CSS (`"72%"`). */
  ancho?: number | string;
  /** Alto en px. */
  alto: number;
  /** Radio en px: 6 por defecto (barras de texto); 999 para pastillas, 8 para botones. */
  radio?: number;
  className?: string;
}

/**
 * Átomo: barra gris del skeleton (`surface-2` → `border`) con un brillo que la recorre cada 1,4 s
 * (sin movimiento con `prefers-reduced-motion`). Decorativa: el anuncio lo hace el contenedor.
 */
export function Skeleton({ ancho = "100%", alto, radio = 6, className }: SkeletonProps) {
  const estilo: CSSProperties = { width: ancho, height: alto, borderRadius: radio };
  return (
    <span
      aria-hidden="true"
      style={estilo}
      className={`block animate-vt-shimmer bg-[linear-gradient(90deg,var(--surface-2)_25%,var(--border)_50%,var(--surface-2)_75%)] bg-[length:200%_100%] motion-reduce:animate-none ${className ?? ""}`}
    />
  );
}
