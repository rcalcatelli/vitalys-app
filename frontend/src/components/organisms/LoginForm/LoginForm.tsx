import { useId, useState } from "react";
import type { FormEvent } from "react";
import { Button } from "../../atoms/Button";
import { FieldError } from "../../atoms/FieldError";
import { FormField } from "../../molecules/FormField";
import { PasswordInput } from "../../molecules/PasswordInput";
import { DemoAccountCard } from "../../molecules/DemoAccountCard";
import { demoAccounts } from "./demoAccounts";
import type { DemoAccount } from "./demoAccounts";

export interface LoginFormProps {
  onSubmit: (identificador: string, contrasena: string) => void;
  /**
   * "¿Olvidaste tu contraseña?" (W-01): no hay endpoint de recuperación en el
   * backend ni un RF que lo contemple, así que este callback no llama a la
   * API — la page navega a una pantalla informativa. El organismo no conoce
   * `react-router`, por eso es un callback y no un `<Link>` directo.
   */
  onForgotPassword: () => void;
  /** "¿No tenés cuenta? Registrate" — misma razón: la navegación la resuelve la page. */
  onGoToRegister: () => void;
  error: string | null;
  cargando: boolean;
}

// Estilo compartido de los dos enlaces de acción (recuperar contraseña /
// registrarse): son `<button>` (no `<a href="#">`) porque no navegan solos,
// delegan en un callback de la page — visualmente se calcan como enlace de
// texto (`bg-transparent border-0 p-0`, ya que el reset global de `button` en
// `index.css` no quita el chrome nativo del botón).
const linkButtonClasses =
  "border-0 bg-transparent p-0 text-clin-ink underline-offset-2 hover:text-clin hover:underline";

/**
 * Organismo del formulario de login (W-01). Presentacional: junta
 * identificador (DNI o email) + contraseña y se los pasa a `onSubmit`. Incluye
 * el encabezado del card ("Ingresá a tu cuenta") y las cuentas de
 * demostración porque son contenido/reglas propias de ESTE formulario, no
 * layout compartido (por eso viven acá y no en el template). No conoce
 * `AuthContext` ni `react-router` — todo lo que implica navegación llega
 * como callback (`onForgotPassword`, `onGoToRegister`) resuelto por la page.
 */
export function LoginForm({
  onSubmit,
  onForgotPassword,
  onGoToRegister,
  error,
  cargando,
}: LoginFormProps) {
  const identificadorId = useId();
  const passwordId = useId();
  const errorId = useId();

  const [identificador, setIdentificador] = useState("");
  const [contrasena, setContrasena] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    onSubmit(identificador, contrasena);
  }

  // Autocompleta los campos con los datos de la cuenta elegida — a propósito
  // NO envía el formulario: el usuario tiene que ver qué se cargó y presionar
  // "Ingresar" él mismo (consigna explícita del diseño, no una decisión
  // nuestra de UX).
  function handleSelectDemo(cuenta: DemoAccount): void {
    setIdentificador(cuenta.identificador);
    setContrasena(cuenta.contrasena);
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="mb-1.5 font-heading text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          Ingresá a tu cuenta
        </h2>
        <p className="text-ink-2">Una sola cuenta para el gimnasio y los consultorios.</p>
      </div>

      <form
        onSubmit={handleSubmit}
        noValidate
        aria-describedby={error !== null ? errorId : undefined}
        className="flex flex-col gap-3.5 text-left"
      >
        <FormField
          id={identificadorId}
          label="DNI o email"
          name="identificador"
          type="text"
          autoComplete="username"
          placeholder="38100001"
          required
          value={identificador}
          onChange={setIdentificador}
          className="font-mono"
        />

        <PasswordInput
          id={passwordId}
          label="Contraseña"
          name="password"
          autoComplete="current-password"
          required
          value={contrasena}
          onChange={setContrasena}
        />

        <Button type="submit" disabled={cargando}>
          {cargando ? "Ingresando…" : "Ingresar"}
        </Button>

        <div className="flex flex-wrap justify-between gap-2 text-sm">
          <button type="button" onClick={onForgotPassword} className={linkButtonClasses}>
            ¿Olvidaste tu contraseña?
          </button>
          <span className="text-ink-2">
            ¿No tenés cuenta?{" "}
            <button type="button" onClick={onGoToRegister} className={linkButtonClasses}>
              Registrate
            </button>
          </span>
        </div>

        {error !== null && <FieldError id={errorId}>{error}</FieldError>}
      </form>

      <div className="flex flex-col gap-2 border-t border-border pt-4">
        <span className="text-xs font-semibold tracking-wider text-ink-3 uppercase">
          Cuentas de demostración
        </span>
        <div className="flex flex-col gap-2">
          {demoAccounts.map((cuenta) => (
            <DemoAccountCard
              key={cuenta.id}
              initials={cuenta.initials}
              name={cuenta.name}
              description={cuenta.description}
              onClick={() => handleSelectDemo(cuenta)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
