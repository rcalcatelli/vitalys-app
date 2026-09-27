import { useState } from "react";
import { Button } from "../../atoms/Button";
import { Input } from "../../atoms/Input";
import type { InputProps } from "../../atoms/Input";
import { Label } from "../../atoms/Label";

export interface PasswordInputProps extends InputProps {
  id: string;
  label: string;
}

// SVG inline (no emoji): heredan el color del texto vía `stroke="currentColor"`
// (respetan el tema claro/oscuro sin ningún cambio) y escalan con las clases
// de Tailwind del botón, a diferencia de un emoji (que se renderiza distinto
// por SO y no hereda color). `aria-hidden`: el nombre accesible lo da el
// `aria-label` del botón que los contiene, no el gráfico.
function EyeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-5 w-5"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-5 w-5"
    >
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 11 7 11 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.53 13.53 0 0 0 1 12s4 7 11 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" y1="2" x2="22" y2="22" />
    </svg>
  );
}

/**
 * Molécula: Label + Input de contraseña + botón mostrar/ocultar SUPERPUESTO
 * (dentro del recuadro del input, no al lado): un `relative` envuelve el
 * `Input` (con `hasTrailingIcon` para reservarle espacio al texto) y el botón
 * va `absolute inset-y-0 right-0`. El foco visible sigue siendo el del
 * `<input>` — el wrapper y el botón no le agregan ni le sacan nada a su
 * propio estilo de foco.
 *
 * El estado de visibilidad es puramente de UI y vive acá adentro (no hace
 * falta levantarlo al form ni a la página). Presentacional puro — no conoce
 * AuthContext ni router.
 */
export function PasswordInput({ id, label, ...inputProps }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input {...inputProps} id={id} type={visible ? "text" : "password"} hasTrailingIcon />
        <Button
          type="button"
          variant="ghost"
          aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
          onClick={() => setVisible((prev) => !prev)}
          className="absolute inset-y-0 right-0"
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </Button>
      </div>
    </div>
  );
}
