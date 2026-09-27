import type { LabelHTMLAttributes } from "react";

export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  htmlFor: string;
}

/** Átomo de etiqueta. Siempre requiere `htmlFor` para no romper la asociación accesible con su input. */
export function Label({ className, ...props }: LabelProps) {
  const classes = ["text-left text-sm font-medium text-ink-2", className].filter(Boolean).join(" ");

  return <label {...props} className={classes} />;
}
