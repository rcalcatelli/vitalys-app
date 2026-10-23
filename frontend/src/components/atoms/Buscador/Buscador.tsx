import type { InputHTMLAttributes } from "react";

export interface BuscadorProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  onChange: (value: string) => void;
  /** Color del borde al enfocar: `clin` (Personas, Pagos, Profesionales) o `gym` (Ingreso). */
  acento?: "clin" | "gym";
  /** Altura del mockup: `md` 44px (Personas, Pagos) o `lg` 46px (Ingreso). */
  alto?: "md" | "lg";
}

const ACENTOS = {
  clin: "focus:border-clin",
  gym: "focus:border-gym",
};

const ALTOS = {
  md: "h-11",
  lg: "h-[46px]",
};

/**
 * Átomo: campo de búsqueda de las pantallas de recepción (15px, radio 10, borde `border-2`). Es
 * más bajo que el `Input` de formularios (48px) y su foco usa el color del servicio de la pantalla.
 */
export function Buscador({
  onChange,
  acento = "clin",
  alto = "md",
  className,
  ...props
}: BuscadorProps) {
  const classes = [
    "w-full rounded-[10px] border border-border-2 bg-surface px-3.5 text-[15px] text-ink",
    "placeholder:text-ink-3 focus:outline-none",
    ACENTOS[acento],
    ALTOS[alto],
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <input
      type="text"
      {...props}
      onChange={(event) => onChange(event.target.value)}
      className={classes}
    />
  );
}
