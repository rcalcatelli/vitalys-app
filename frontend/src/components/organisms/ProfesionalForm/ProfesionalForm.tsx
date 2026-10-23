import { useState } from "react";
import type { FormEvent } from "react";
import { Button } from "../../atoms/Button";
import { FieldError } from "../../atoms/FieldError";
import { Label } from "../../atoms/Label";
import { Select } from "../../atoms/Select";
import { FormField } from "../../molecules/FormField";
import { PasswordInput } from "../../molecules/PasswordInput";
import type { Especialidad, Profesional, ProfesionalAlta } from "../../../types/profesional";
import { DURACION_SUGERIDA, ESPECIALIDADES, etiquetaEspecialidad } from "../../../utils/formato";

export type ProfesionalFormValues = ProfesionalAlta;

export interface ProfesionalFormProps {
  /** Sin `profesional` es un alta (RF-11): pide email y contraseña inicial. Con `profesional` es edición (RF-13). */
  profesional?: Profesional;
  onSubmit: (values: ProfesionalFormValues) => void;
  onCancel: () => void;
  /** Error devuelto por el servidor (p. ej. email duplicado). */
  error?: string | null;
  cargando?: boolean;
}

type Campo = "nombre" | "apellido" | "email" | "pw" | "dur";

const REQUERIDO = "Campo obligatorio.";
const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DURACION_MAXIMA = 240;

/**
 * Formulario de alta/edición de profesional (modal de la pantalla de Profesionales).
 * Valida en el cliente lo mismo que el backend para mostrar el error al lado del
 * campo una vez tocado; el servidor sigue decidiendo (unicidad del email). La
 * contraseña inicial solo se pide en el alta, y al cambiar la especialidad se
 * autocompleta la duración sugerida, que el ADMIN puede ajustar.
 */
export function ProfesionalForm({
  profesional,
  onSubmit,
  onCancel,
  error = null,
  cargando = false,
}: ProfesionalFormProps) {
  const esAlta = profesional === undefined;
  const [nombre, setNombre] = useState(profesional?.nombre ?? "");
  const [apellido, setApellido] = useState(profesional?.apellido ?? "");
  const [email, setEmail] = useState(profesional?.email ?? "");
  const [contrasena, setContrasena] = useState("");
  const [especialidad, setEspecialidad] = useState<Especialidad>(
    profesional?.especialidad ?? "NUTRICION",
  );
  const [duracion, setDuracion] = useState(
    String(profesional?.duracionTurnoMinutos ?? DURACION_SUGERIDA.NUTRICION),
  );
  const [tocados, setTocados] = useState<Partial<Record<Campo, boolean>>>({});

  const errores: Partial<Record<Campo, string>> = {};
  if (!nombre.trim()) errores.nombre = REQUERIDO;
  if (!apellido.trim()) errores.apellido = REQUERIDO;
  if (esAlta) {
    const correo = email.trim();
    if (!correo) errores.email = REQUERIDO;
    else if (!EMAIL_VALIDO.test(correo)) errores.email = "Ingresá un email válido.";
    if (!contrasena) errores.pw = REQUERIDO;
    else if (contrasena.length < 8) errores.pw = "Mínimo 8 caracteres.";
  }
  const minutos = parseInt(duracion, 10);
  if (duracion.trim() === "") errores.dur = REQUERIDO;
  else if (!(minutos > 0)) errores.dur = "La duración debe ser mayor a 0.";
  else if (minutos > DURACION_MAXIMA)
    errores.dur = `La duración no puede superar ${DURACION_MAXIMA} minutos.`;

  const invalido = Object.keys(errores).length > 0;
  const tocar = (campo: Campo) => setTocados((prev) => ({ ...prev, [campo]: true }));
  const mostrar = (campo: Campo) => (tocados[campo] ? errores[campo] : undefined);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (invalido) return;
    onSubmit({
      email: email.trim().toLowerCase(),
      contrasena,
      datos: {
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        especialidad,
        duracionTurnoMinutos: minutos,
      },
    });
  }

  function elegirEspecialidad(valor: string) {
    const nueva = valor as Especialidad;
    setEspecialidad(nueva);
    setDuracion(String(DURACION_SUGERIDA[nueva]));
    tocar("dur");
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-label={esAlta ? "Nuevo profesional" : "Editar profesional"}
      className="flex flex-col gap-4"
    >
      <div className="grid grid-cols-2 gap-2.5">
        <FormField
          id="profesional-nombre"
          label="Nombre"
          value={nombre}
          error={mostrar("nombre")}
          onChange={(v) => {
            setNombre(v);
            tocar("nombre");
          }}
        />
        <FormField
          id="profesional-apellido"
          label="Apellido"
          value={apellido}
          error={mostrar("apellido")}
          onChange={(v) => {
            setApellido(v);
            tocar("apellido");
          }}
        />
      </div>

      <FormField
        id="profesional-email"
        label="Email · será su usuario de acceso"
        type="email"
        autoComplete="off"
        value={email}
        // El backend no permite cambiar el email desde la edición (PUT solo trae nombre, apellido, especialidad y duración).
        disabled={!esAlta}
        error={mostrar("email")}
        onChange={(v) => {
          setEmail(v);
          tocar("email");
        }}
      />

      {esAlta && (
        <div className="flex flex-col gap-1">
          <PasswordInput
            id="profesional-contrasena"
            label="Contraseña inicial"
            placeholder="Mínimo 8 caracteres"
            autoComplete="new-password"
            value={contrasena}
            onChange={(v) => {
              setContrasena(v);
              tocar("pw");
            }}
          />
          <span className="text-left text-xs text-ink-3">
            Compartila con el profesional por un medio seguro.
          </span>
          {mostrar("pw") && <span className="text-left text-xs text-bad-ink">{mostrar("pw")}</span>}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] items-start gap-2.5">
          <div className="flex flex-col gap-1">
            <Label htmlFor="profesional-especialidad">Especialidad</Label>
            <Select
              id="profesional-especialidad"
              value={especialidad}
              onChange={elegirEspecialidad}
            >
              {ESPECIALIDADES.map((e) => (
                <option key={e} value={e}>
                  {etiquetaEspecialidad(e)}
                </option>
              ))}
            </Select>
          </div>
          <FormField
            id="profesional-duracion"
            label="Duración del turno (min)"
            inputMode="numeric"
            className="font-mono"
            value={duracion}
            error={mostrar("dur")}
            onChange={(v) => {
              setDuracion(v.replace(/\D/g, ""));
              tocar("dur");
            }}
          />
        </div>
        <span className="text-xs text-ink-3">
          Sugerido para {etiquetaEspecialidad(especialidad)}: {DURACION_SUGERIDA[especialidad]} min.
          Podés ajustarlo.
        </span>
      </div>

      {error && <FieldError>{error}</FieldError>}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="neutral" size="modal" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" size="modal" disabled={invalido || cargando}>
          {cargando ? "Guardando…" : esAlta ? "Crear profesional" : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}
