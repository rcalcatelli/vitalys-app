import type { InputHTMLAttributes } from "react";

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  onChange: (value: string) => void;
  /**
   * `true` cuando el input convive con un botón superpuesto adentro (p.ej. el
   * ojo de `PasswordInput`): cambia el padding horizontal a `pl-3 pr-12` para
   * que el texto no quede tapado por el botón. Es una prop y no una
   * `className` suelta a propósito — Tailwind genera `px-3` (base) y un
   * `pr-*` pasado desde afuera con la misma especificidad, y cuál "gana"
   * depende del orden de generación de la hoja de estilos, no del orden en el
   * string de clases. Resolverlo acá adentro con dos variantes mutuamente
   * excluyentes evita ese conflicto de raíz.
   */
  hasTrailingIcon?: boolean;
}

/**
 * Átomo de input de texto. Presentacional puro: recibe `value`/`onChange` con
 * el valor ya "desempaquetado" (string), no el `ChangeEvent` crudo, para que
 * las moléculas/organismos que lo usan no acoplen su estado a la forma del evento.
 */
export function Input({ onChange, className, hasTrailingIcon = false, ...props }: InputProps) {
  const classes = [
    // `h-12` (48px): calco del input del mockup (`height:46px`, redondeado al
    // step de Tailwind más cercano) — ya cubre de sobra el mínimo táctil de
    // 44px, mobile first (no hace falta "corregir" en ningún breakpoint).
    "w-full h-12 rounded-md border border-border-2 bg-surface text-base text-ink",
    hasTrailingIcon ? "pl-3 pr-12" : "px-3",
    "focus:outline-none focus:border-clin focus:ring-2 focus:ring-clin-soft",
    "disabled:cursor-not-allowed disabled:opacity-60",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <input {...props} onChange={(event) => onChange(event.target.value)} className={classes} />
  );
}
