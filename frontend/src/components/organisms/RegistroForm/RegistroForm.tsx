import { useId, useState } from "react";
import type { FormEvent } from "react";
import { Button } from "../../atoms/Button";
import { FieldError } from "../../atoms/FieldError";
import { FormField } from "../../molecules/FormField";
import { PasswordInput } from "../../molecules/PasswordInput";

export interface RegistroFormProps {
  onSubmit: (email: string, contrasena: string) => void;
  /** "¿Ya tenés cuenta? Ingresá" — la navegación la resuelve la page (mismo patrón que `LoginForm`). */
  onGoToLogin: () => void;
  error: string | null;
  cargando: boolean;
}

// Mismo estilo de enlace-botón que `LoginForm` (RN de consistencia visual entre
// las dos pantallas de auth, no duplicado a propósito porque cada organismo es
// independiente y no comparten un padre común más que el layout).
const linkButtonClasses =
  "border-0 bg-transparent p-0 text-clin-ink underline-offset-2 hover:text-clin hover:underline";

/**
 * Organismo del formulario de registro (W-06), calcado del estado
 * `auth === 'register'` de `docs/02-diseno/design-system/Vitalys.dc.html`.
 *
 * El mockup también muestra Nombre/Apellido/DNI y un selector "¿Qué vas a
 * usar?" (Gimnasio/Consultorios) — NINGUNO de los tres se construyó: el
 * registro público es solo `{ email, contrasena }` (RF-01/CA-01-1), un
 * usuario recién registrado todavía no tiene fila en `personas` (CA-01-6, a
 * diferencia del login no hay "DNI o email" dual posible), y esos datos los
 * completa el ADMIN después. Construir esos campos habría armado un formulario
 * que no persiste nada de lo que pide. Por la misma razón tampoco hay selector
 * de rol: el backend lo fuerza siempre a `SOCIO_PACIENTE` y responde 400 si el
 * body incluye la clave `rol` (CA-01-7) — este organismo solo expone
 * `onSubmit(email, contrasena)`, nunca `rol`.
 *
 * Se mantiene "Confirmar contraseña" (no está en el mockup): es una validación
 * puramente de UI que ya existía, no viaja al backend y no contradice el
 * contrato — se resuelve acá adentro sin que la page la vea.
 *
 * Presentacional puro: no conoce `AuthContext` ni `react-router`.
 */
export function RegistroForm({ onSubmit, onGoToLogin, error, cargando }: RegistroFormProps) {
  const emailId = useId();
  const passwordId = useId();
  const confirmPasswordId = useId();
  const errorId = useId();

  const [email, setEmail] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [confirmarContrasena, setConfirmarContrasena] = useState("");
  const [mismatchError, setMismatchError] = useState<string | null>(null);

  // La validación de coincidencia es puramente de UI: se resuelve acá adentro
  // sin tocar el backend. El error "real" (409/400 de la API) sigue viniendo
  // por props desde el contenedor.
  const errorAMostrar = mismatchError ?? error;

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setMismatchError(null);

    if (contrasena !== confirmarContrasena) {
      setMismatchError("Las contraseñas no coinciden");
      return;
    }

    onSubmit(email, contrasena);
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="mb-1.5 font-heading text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          Creá tu cuenta
        </h2>
        <p className="text-ink-2">Con la misma cuenta podés usar el gimnasio y los consultorios.</p>
      </div>

      <form
        onSubmit={handleSubmit}
        noValidate
        aria-describedby={errorAMostrar !== null ? errorId : undefined}
        className="flex flex-col gap-3.5 text-left"
      >
        <FormField
          id={emailId}
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={setEmail}
        />

        <PasswordInput
          id={passwordId}
          label="Contraseña"
          name="password"
          autoComplete="new-password"
          placeholder="Mínimo 8 caracteres"
          required
          minLength={8}
          value={contrasena}
          onChange={setContrasena}
        />

        <PasswordInput
          id={confirmPasswordId}
          label="Confirmar contraseña"
          name="confirmPassword"
          autoComplete="new-password"
          required
          minLength={8}
          value={confirmarContrasena}
          onChange={setConfirmarContrasena}
        />

        <Button type="submit" disabled={cargando}>
          {cargando ? "Creando cuenta…" : "Crear cuenta"}
        </Button>

        {errorAMostrar !== null && <FieldError id={errorId}>{errorAMostrar}</FieldError>}

        <span className="text-center text-sm text-ink-2">
          ¿Ya tenés cuenta?{" "}
          <button type="button" onClick={onGoToLogin} className={linkButtonClasses}>
            Ingresá
          </button>
        </span>
      </form>
    </div>
  );
}
