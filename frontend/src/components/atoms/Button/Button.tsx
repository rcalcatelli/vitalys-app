import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "ghost" | "outline";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * `primary`: botón de acción principal (submit de un form, full width).
   * `ghost`: botón sin fondo, para acciones secundarias/icónicas (mostrar/ocultar contraseña).
   */
  variant?: ButtonVariant;
}

// `min-h-11` (2.75rem = 44px) en la base, sin prefijo de breakpoint: es un
// mínimo de área táctil (mobile first), no una corrección para desktop, así
// que aplica siempre — no tiene sentido "sacarla" en pantallas grandes.
// Sin `font-weight` acá: cada variant define el suyo, para no competir por
// la misma propiedad con dos utilidades de igual especificidad (ver
// README de `src/components/`, sección Tailwind).
const baseClasses =
  "inline-flex min-h-11 items-center justify-center rounded-md transition-colors " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clin-soft " +
  "disabled:cursor-not-allowed disabled:opacity-60";

const variantClasses: Record<ButtonVariant, string> = {
  // `bg-clin`/`text-on-clin` + `hover:brightness-110`: calco del botón
  // primario del mockup (`background:var(--clin);color:var(--on-clin)`,
  // `style-hover="filter:brightness(1.08)"`).
  primary: "h-12 w-full bg-clin px-4 text-on-clin font-semibold hover:brightness-110",
  // `min-w-11` además de la `min-h-11` de la base: este variant es para
  // botones ícono-only (mostrar/ocultar contraseña), que sin esto quedarían
  // angostos y difíciles de tocar en mobile.
  ghost: "min-w-11 bg-transparent px-2 py-1 text-lg text-ink-2 hover:text-ink",
  // Calco del botón de tema del mockup (`height:36px;border:1px solid
  // var(--border);border-radius:8px;background:var(--surface);color:var(--text-2)`):
  // acción secundaria con borde visible, no tan discreta como `ghost` pero sin
  // el peso visual de `primary`. `h-9` (36px) queda por debajo del mínimo
  // táctil de 44px del resto de la escala a propósito — es del mismo tamaño
  // que en el mockup porque convive con el logo en una fila angosta, nunca es
  // la acción principal de la pantalla.
  outline: "h-9 border border-border bg-surface px-3 text-sm text-ink-2 hover:border-clin",
};

/** Átomo de botón. Presentacional puro: no conoce routing ni auth. */
export function Button({ variant = "primary", className, ...props }: ButtonProps) {
  const classes = [baseClasses, variantClasses[variant], className].filter(Boolean).join(" ");
  return <button {...props} className={classes} />;
}
