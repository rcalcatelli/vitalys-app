import type { ReactNode } from "react";

export type ChipTone = "ok" | "warn" | "bad" | "clin" | "gym" | "neutral";

export interface ChipProps {
  tone?: ChipTone;
  /** Cuadradito de 6px del color del tono (`currentColor`), como en el mockup. */
  dot?: boolean;
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

/** Átomo: pastilla de estado/servicio (`ok|warn|bad|clin|gym|neutral`), con punto opcional. */
export function Chip({ tone = "neutral", dot = false, children, className }: ChipProps) {
  return (
    <span
      className={[
        "inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold whitespace-nowrap",
        TONES[tone],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {dot && <span aria-hidden="true" className="h-1.5 w-1.5 rounded-xs bg-current" />}
      {children}
    </span>
  );
}
