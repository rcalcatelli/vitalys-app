import type { ReactNode } from "react";

export interface FieldErrorProps {
  id?: string;
  children: ReactNode;
}

/**
 * Átomo de error accesible: `role="alert"` para que los lectores de pantalla
 * lo anuncien apenas aparece, sin que el usuario tenga que buscarlo. El
 * consumidor puede pasarle un `id` para asociarlo a un input/form vía
 * `aria-describedby`.
 */
export function FieldError({ id, children }: FieldErrorProps) {
  return (
    // Calco del banner de error del mockup: `background:var(--bad-soft)`,
    // `color:var(--bad-ink)`, sin borde, `border-radius:8px`.
    <div id={id} role="alert" className="rounded-md bg-bad-soft px-3 py-2.5 text-sm text-bad-ink">
      ⚠ {children}
    </div>
  );
}
