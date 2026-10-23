import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant =
  "primary" | "gym" | "ok" | "bad" | "tonal-ok" | "tonal-bad" | "outline" | "ghost";

export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * `primary`: acción principal (teal). `gym`/`ok`/`bad`: acción sólida de dominio (gimnasio,
   * confirmación, destructiva). `tonal-ok`/`tonal-bad`: fondo suave con borde (Atendido / Ausente).
   * `outline`: acción secundaria con borde. `ghost`: sin fondo, para acciones ícono.
   */
  variant?: ButtonVariant;
  /**
   * Altura del mockup: `sm` 38px (acciones de tabla), `md` 44px, `lg` 48px (auth y modales).
   * Por defecto `outline` es `sm` y el resto `md`.
   */
  size?: ButtonSize;
  /** Ocupa todo el ancho del contenedor (login, registro). Por defecto el botón mide lo que su texto. */
  fullWidth?: boolean;
}

// Sin `font-weight` ni `height` en la base: cada variant/size define los suyos, para no competir
// por la misma propiedad con dos utilidades de igual especificidad (ver README de
// `src/components/`, sección Tailwind). Mínimo de área táctil: `md`/`lg` >= 44px.
const baseClasses =
  "inline-flex items-center justify-center rounded-md transition-colors " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clin-soft " +
  "disabled:cursor-not-allowed disabled:opacity-60";

// Calco de los botones del mockup: sólidos `text-[15px] font-semibold` con `hover:brightness-110`
// (`style-hover="filter:brightness(1.08)"`), tonales con borde del color del estado.
const SOLIDO = "px-4 text-[15px] font-semibold hover:brightness-110";
const TONAL = "border px-3 text-[13px] font-semibold";

const variantClasses: Record<ButtonVariant, string> = {
  primary: `${SOLIDO} bg-clin text-on-clin`,
  gym: `${SOLIDO} bg-gym text-on-gym`,
  ok: `${SOLIDO} bg-ok text-white`,
  bad: `${SOLIDO} bg-bad text-white`,
  "tonal-ok": `${TONAL} border-ok bg-ok-soft text-ok-ink`,
  "tonal-bad": `${TONAL} border-bad bg-bad-soft text-bad-ink`,
  // Calco del botón de tema del mockup (`border:1px solid var(--border);border-radius:8px;
  // background:var(--surface);color:var(--text-2)`): acción secundaria con borde visible.
  outline:
    "border border-border bg-surface px-3 text-[13px] font-medium text-ink-2 hover:border-clin",
  // `min-w-11`: botones ícono-only (mostrar/ocultar contraseña) necesitan área táctil de 44px.
  ghost: "min-h-11 min-w-11 bg-transparent px-2 py-1 text-lg text-ink-2 hover:text-ink",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-[38px]",
  md: "h-11",
  lg: "h-12",
};

/** Átomo de botón. Presentacional puro: no conoce routing ni auth. */
export function Button({
  variant = "primary",
  size,
  fullWidth = false,
  className,
  ...props
}: ButtonProps) {
  const tamano =
    variant === "ghost" ? "" : sizeClasses[size ?? (variant === "outline" ? "sm" : "md")];
  const classes = [
    baseClasses,
    variantClasses[variant],
    tamano,
    fullWidth ? "w-full" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return <button {...props} className={classes} />;
}
