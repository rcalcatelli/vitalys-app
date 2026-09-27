import { Input } from "../../atoms/Input";
import type { InputProps } from "../../atoms/Input";
import { Label } from "../../atoms/Label";

export interface FormFieldProps extends InputProps {
  id: string;
  label: string;
}

/**
 * Molécula: Label + Input asociados por `id`. Cubre los campos simples de los
 * formularios de auth (email). Presentacional puro — no conoce AuthContext ni router.
 */
export function FormField({ id, label, ...inputProps }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} {...inputProps} />
    </div>
  );
}
