import { useCallback, useEffect, useState } from "react";
import { ApiError } from "../api/http";
import * as personasApi from "../api/personasApi";
import { Button } from "../components/atoms/Button";
import { FieldError } from "../components/atoms/FieldError";
import { Input } from "../components/atoms/Input";
import { AdminNav } from "../components/molecules/AdminNav";
import { PersonaForm } from "../components/organisms/PersonaForm";
import type { PersonaFormValues } from "../components/organisms/PersonaForm";
import { PersonasTable } from "../components/organisms/PersonasTable";
import { useAuth } from "../context/AuthContext";
import type { FiltroPersonas, Persona } from "../types/persona";

const FILTROS: [FiltroPersonas, string][] = [
  ["TODOS", "Todos"],
  ["ACTIVOS", "Activos"],
  ["INACTIVOS", "Inactivos"],
  ["GYM", "Solo gym"],
];

/** Espera antes de consultar mientras se escribe en el buscador. */
const DEMORA_BUSQUEDA_MS = 300;

type Panel = { modo: "cerrado" } | { modo: "alta" } | { modo: "edicion"; persona: Persona };

function mensajeDeError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 409 || err.status === 400) return err.message;
    if (err.status === 403) return "Tu usuario no tiene permiso para esta operación.";
  }
  return "No se pudo completar la operación. Intentá de nuevo.";
}

/**
 * W-05 — ABM de personas (ADMIN). Contenedor: consulta la API, decide qué
 * panel mostrar y refresca el listado después de cada cambio. La tabla y el
 * formulario son presentacionales.
 */
export function PersonasPage() {
  const { usuario, logout } = useAuth();
  const [filtro, setFiltro] = useState<FiltroPersonas>("TODOS");
  const [texto, setTexto] = useState("");
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [cargandoLista, setCargandoLista] = useState(true);
  const [errorLista, setErrorLista] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>({ modo: "cerrado" });
  const [errorPanel, setErrorPanel] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  const cargar = useCallback(async (f: FiltroPersonas, t: string) => {
    setCargandoLista(true);
    try {
      setPersonas(await personasApi.listarPersonas(f, t));
      setErrorLista(null);
    } catch (err) {
      setErrorLista(mensajeDeError(err));
    } finally {
      setCargandoLista(false);
    }
  }, []);

  useEffect(() => {
    const id = setTimeout(() => void cargar(filtro, texto), DEMORA_BUSQUEDA_MS);
    return () => clearTimeout(id);
  }, [cargar, filtro, texto]);

  function abrir(nuevo: Panel) {
    setErrorPanel(null);
    setAviso(null);
    setPanel(nuevo);
  }

  async function guardar(values: PersonaFormValues) {
    setGuardando(true);
    setErrorPanel(null);
    try {
      const persona =
        panel.modo === "edicion"
          ? await personasApi.actualizarPersona(panel.persona.id, values.datos)
          : await personasApi.crearPersona(values);
      setAviso(
        panel.modo === "edicion"
          ? `Se guardaron los cambios de ${persona.apellido}, ${persona.nombre}.`
          : `${persona.apellido}, ${persona.nombre} se agregó a Personas.`,
      );
      setPanel({ modo: "cerrado" });
      await cargar(filtro, texto);
    } catch (err) {
      setErrorPanel(mensajeDeError(err));
    } finally {
      setGuardando(false);
    }
  }

  async function cambiarEstado(persona: Persona, accion: "baja" | "reactivar") {
    setGuardando(true);
    setAviso(null);
    try {
      const actualizada =
        accion === "baja"
          ? await personasApi.darDeBajaPersona(persona.id)
          : await personasApi.reactivarPersona(persona.id);
      setAviso(
        accion === "baja"
          ? `${actualizada.apellido}, ${actualizada.nombre} quedó dada de baja.`
          : `${actualizada.apellido}, ${actualizada.nombre} volvió a estar activa.`,
      );
      await cargar(filtro, texto);
    } catch (err) {
      setErrorLista(mensajeDeError(err));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6 sm:px-6 sm:py-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold tracking-wider text-ink-3 uppercase">
            Administración
          </span>
          <h1 className="font-heading text-2xl font-semibold text-ink sm:text-3xl">Personas</h1>
          <p className="text-sm text-ink-2">Socios y pacientes del centro.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-ink-3 sm:inline">{usuario?.email}</span>
          <Button type="button" variant="outline" onClick={logout}>
            Cerrar sesión
          </Button>
        </div>
      </header>

      <AdminNav />

      <div className="flex flex-wrap gap-2.5">
        <Input
          aria-label="Buscar por nombre, apellido o DNI"
          placeholder="Buscar por nombre, apellido o DNI"
          value={texto}
          onChange={setTexto}
          className="min-w-0 flex-[1_1_240px]"
        />
        <Button type="button" className="sm:w-auto" onClick={() => abrir({ modo: "alta" })}>
          + Nueva persona
        </Button>
      </div>

      <div className="flex gap-1.5 overflow-x-auto" role="group" aria-label="Filtrar personas">
        {FILTROS.map(([clave, etiqueta]) => {
          const activo = filtro === clave;
          return (
            <button
              key={clave}
              type="button"
              aria-pressed={activo}
              onClick={() => setFiltro(clave)}
              className={[
                "h-9 rounded-full border px-3.5 text-sm font-medium whitespace-nowrap",
                activo ? "border-ink bg-ink text-bg" : "border-border bg-surface text-ink-2",
              ].join(" ")}
            >
              {etiqueta}
            </button>
          );
        })}
      </div>

      {aviso && (
        <div role="status" className="rounded-md bg-ok-soft px-3 py-2.5 text-sm text-ok-ink">
          {aviso}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start">
        <section
          aria-label="Listado de personas"
          aria-busy={cargandoLista}
          className="flex flex-col gap-3"
        >
          {errorLista && <FieldError>{errorLista}</FieldError>}
          {cargandoLista && personas.length === 0 ? (
            <p className="text-sm text-ink-3">Cargando personas…</p>
          ) : (
            <PersonasTable
              personas={personas}
              ocupado={guardando}
              onEditar={(p) => abrir({ modo: "edicion", persona: p })}
              onBaja={(p) => void cambiarEstado(p, "baja")}
              onReactivar={(p) => void cambiarEstado(p, "reactivar")}
            />
          )}
        </section>

        {panel.modo !== "cerrado" && (
          <PersonaForm
            key={panel.modo === "edicion" ? panel.persona.id : "alta"}
            persona={panel.modo === "edicion" ? panel.persona : undefined}
            onSubmit={(values) => void guardar(values)}
            onCancel={() => setPanel({ modo: "cerrado" })}
            error={errorPanel}
            cargando={guardando}
          />
        )}
      </div>
    </main>
  );
}
