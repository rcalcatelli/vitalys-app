import { Input } from "../../atoms/Input";
import type { InputProps } from "../../atoms/Input";
import { Label } from "../../atoms/Label";

export interface FormFieldProps extends InputProps {
  id: string;
  label: string;
  /** Texto de ayuda debajo del campo (siempre visible). */
  help?: string;
  /** Error inline del campo: marca el input como inválido y se asocia por `aria-describedby`. */
  error?: string;
}

/**
 * Molécula: Label + Input asociados por `id`. Cubre los campos simples de los
 * formularios (email, nombre…), con ayuda y error inline opcionales. Presentacional
 * puro — no conoce AuthContext ni router.
 */
export function FormField({ id, label, help, error, className, ...inputProps }: FormFieldProps) {
  const helpId = help ? `${id}-help` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [helpId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={[error ? "border-bad" : "", className].filter(Boolean).join(" ") || undefined}
        {...inputProps}
      />
      {help && (
        <span id={helpId} className="text-left text-xs text-ink-3">
          {help}
        </span>
      )}
      {error && (
        <span id={errorId} className="text-left text-xs text-bad-ink">
          {error}
        </span>
      )}
    </div>
  );
}
