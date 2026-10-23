import { useState } from "react";
import type { FormEvent } from "react";
import { Button } from "../../atoms/Button";
import { FieldError } from "../../atoms/FieldError";
import { FormField } from "../../molecules/FormField";
import { PasswordInput } from "../../molecules/PasswordInput";
import type { Persona, PersonaDatos } from "../../../types/persona";

export interface PersonaFormValues {
  email: string;
  contrasena: string;
  datos: PersonaDatos;
}

export interface PersonaFormProps {
  /** Sin `persona` es un alta presencial (RF-05): pide email y contraseña. Con `persona` es edición (RF-07). */
  persona?: Persona;
  /**
   * Solo sin `persona`. `vinculo` (RF-31) pide el email de un usuario que ya se registró y no
   * pide contraseña: el usuario ya tiene la suya.
   */
  modo?: "alta" | "vinculo";
  onSubmit: (values: PersonaFormValues) => void;
  onCancel: () => void;
  error?: string | null;
  cargando?: boolean;
}

const DNI_VALIDO = /^\d{7,9}$/;

function vacioANull(valor: string): string | null {
  const limpio = valor.trim();
  return limpio === "" ? null : limpio;
}

/**
 * Contenido del modal de alta/edición/vínculo de Personas (el título lo pone el `Modal`). Valida en el cliente lo mismo que el backend
 * (DNI de 7 a 9 dígitos, contraseña ≥ 8, fecha de membresía obligatoria para
 * socios del gimnasio) para dar el error al lado del campo; el servidor sigue
 * siendo quien decide, en particular la unicidad del DNI.
 */
export function PersonaForm({
  persona,
  modo = "alta",
  onSubmit,
  onCancel,
  error = null,
  cargando = false,
}: PersonaFormProps) {
  const esAlta = persona === undefined;
  const esVinculo = esAlta && modo === "vinculo";
  const pideContrasena = esAlta && !esVinculo;
  const [email, setEmail] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [nombre, setNombre] = useState(persona?.nombre ?? "");
  const [apellido, setApellido] = useState(persona?.apellido ?? "");
  const [dni, setDni] = useState(persona?.dni ?? "");
  const [telefono, setTelefono] = useState(persona?.telefono ?? "");
  const [fechaNacimiento, setFechaNacimiento] = useState(persona?.fechaNacimiento ?? "");
  const [esSocioGym, setEsSocioGym] = useState(persona?.esSocioGym ?? false);
  const [fechaInicioMembresia, setFechaInicioMembresia] = useState(
    persona?.fechaInicioMembresia ?? "",
  );
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  function validar(): string | null {
    if (esAlta && !email.includes("@")) return "Ingresá un email válido.";
    if (pideContrasena && contrasena.length < 8)
      return "La contraseña debe tener al menos 8 caracteres.";
    if (!nombre.trim() || !apellido.trim()) return "Ingresá nombre y apellido.";
    if (!DNI_VALIDO.test(dni)) return "El DNI tiene que tener entre 7 y 9 dígitos, sin puntos.";
    if (esSocioGym && !fechaInicioMembresia)
      return "Un socio del gimnasio necesita fecha de inicio de membresía.";
    return null;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const problema = validar();
    setErrorLocal(problema);
    if (problema) return;
    onSubmit({
      email: email.trim(),
      contrasena: pideContrasena ? contrasena : "",
      datos: {
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        dni,
        telefono: vacioANull(telefono),
        fechaNacimiento: vacioANull(fechaNacimiento),
        esSocioGym,
        fechaInicioMembresia: esSocioGym ? fechaInicioMembresia : null,
      },
    });
  }

  const mensaje = errorLocal ?? error;

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-label={
        esVinculo ? "Vincular usuario existente" : esAlta ? "Nueva persona" : "Editar persona"
      }
      className="flex flex-col gap-4"
    >
      {esVinculo && (
        <p className="text-sm text-ink-2">
          Para quien ya se registró en la app. Se busca por su email y no se pide contraseña: ya
          tiene la suya.
        </p>
      )}

      {esAlta && (
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            id="persona-email"
            label={esVinculo ? "Email con el que se registró" : "Email"}
            type="email"
            value={email}
            onChange={setEmail}
            autoComplete="off"
          />
          {pideContrasena && (
            <PasswordInput
              id="persona-contrasena"
              label="Contraseña inicial"
              value={contrasena}
              onChange={setContrasena}
            />
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="persona-nombre" label="Nombre" value={nombre} onChange={setNombre} />
        <FormField id="persona-apellido" label="Apellido" value={apellido} onChange={setApellido} />
        <FormField
          id="persona-dni"
          label="DNI"
          inputMode="numeric"
          value={dni}
          onChange={(v) => setDni(v.replace(/\D/g, ""))}
        />
        <FormField id="persona-telefono" label="Teléfono" value={telefono} onChange={setTelefono} />
        <FormField
          id="persona-nacimiento"
          label="Fecha de nacimiento"
          type="date"
          value={fechaNacimiento}
          onChange={setFechaNacimiento}
        />
      </div>

      <label className="flex min-h-11 items-center gap-3 text-sm text-ink">
        <input
          type="checkbox"
          checked={esSocioGym}
          onChange={(e) => setEsSocioGym(e.target.checked)}
          className="h-5 w-5 accent-gym"
        />
        Socio del gimnasio
      </label>

      {esSocioGym && (
        <FormField
          id="persona-membresia"
          label="Inicio de la membresía"
          type="date"
          value={fechaInicioMembresia}
          onChange={setFechaInicioMembresia}
        />
      )}

      {mensaje && <FieldError>{mensaje}</FieldError>}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="neutral" size="modal" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" size="modal" disabled={cargando}>
          {cargando
            ? "Guardando…"
            : esVinculo
              ? "Vincular ficha"
              : esAlta
                ? "Dar de alta"
                : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}
