import type { SelectHTMLAttributes } from "react";

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "onChange"> {
  onChange: (value: string) => void;
}

/** Átomo de select nativo, con el mismo aspecto que `Input` y el valor ya desempaquetado (string). */
export function Select({ onChange, className, ...props }: SelectProps) {
  const classes = [
    "h-11 w-full min-w-0 rounded-md border border-border-2 bg-surface px-2 text-sm text-ink",
    "focus:outline-none focus:border-clin focus:ring-2 focus:ring-clin-soft",
    "disabled:cursor-not-allowed disabled:opacity-60",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <select {...props} onChange={(event) => onChange(event.target.value)} className={classes} />
  );
}
