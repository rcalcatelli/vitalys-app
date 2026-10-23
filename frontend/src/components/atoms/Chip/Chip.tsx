import type { ReactNode } from "react";

export type ChipTone = "ok" | "warn" | "bad" | "clin" | "gym" | "neutral";

export interface ChipProps {
  tone?: ChipTone;
  /** Punto de 6px del color del tono (`currentColor`), como en el mockup. */
  dot?: boolean;
  /**
   * `lg` (12.5px) es el estado destacado de la tarjeta de cuota. `md` (12px, 24px de alto) es la
   * pastilla de estado de tablas y tarjetas. `sm` (11.5px) la usan
   * las listas compactas ("Requieren atención", notificaciones). `etiqueta` es el rectángulo de
   * radio 6 que marca un servicio (Gimnasio, Nutrición).
   */
  tamano?: "lg" | "md" | "sm" | "etiqueta";
  children: ReactNode;
  className?: string;
}

const TONES: Record<ChipTone, string> = {
  ok: "bg-ok-soft text-ok-ink",
  warn: "bg-warn-soft text-warn-ink",
  bad: "bg-bad-soft text-bad-ink",
  clin: "bg-clin-soft text-clin-ink",
  gym: "bg-gym-soft text-gym-ink",
  neutral: "bg-surface-2 text-ink-2",
};

const TAMANOS = {
  lg: "rounded-full px-3 py-1 text-caption",
  md: "h-6 rounded-full px-2.5 text-xs",
  sm: "rounded-full px-[9px] py-[3px] text-micro",
  etiqueta: "rounded-sm px-2 py-0.5 text-micro",
};

/** Átomo: pastilla de estado/servicio (`ok|warn|bad|clin|gym|neutral`), con punto opcional. */
export function Chip({
  tone = "neutral",
  dot = false,
  tamano = "md",
  children,
  className,
}: ChipProps) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 font-semibold whitespace-nowrap",
        TAMANOS[tamano],
        TONES[tone],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {dot && <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}
