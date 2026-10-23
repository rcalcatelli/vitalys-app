import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError } from "../api/http";
import * as personasApi from "../api/personasApi";
import { Button } from "../components/atoms/Button";
import { Buscador } from "../components/atoms/Buscador";
import { FieldError } from "../components/atoms/FieldError";
import { FiltroPildoras } from "../components/molecules/FiltroPildoras";
import { Modal } from "../components/molecules/Modal";
import { PageHeader } from "../components/molecules/PageHeader";
import { PersonaForm } from "../components/organisms/PersonaForm";
import type { PersonaFormValues } from "../components/organisms/PersonaForm";
import { PersonasTable } from "../components/organisms/PersonasTable";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../hooks/useToast";
import type { FiltroPersonas, Persona } from "../types/persona";

const FILTROS = [
  ["TODOS", "Todos"],
  ["GYM", "Gimnasio"],
  ["CONSULTORIO", "Consultorio"],
  ["CON_DEUDA", "Con deuda"],
] as const;

/** Espera antes de consultar mientras se escribe en el buscador. */
const DEMORA_BUSQUEDA_MS = 300;

type Panel =
  | { modo: "cerrado" }
  | { modo: "alta" }
  | { modo: "vinculo" }
  | { modo: "edicion"; persona: Persona };

function mensajeDeError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 409 || err.status === 400 || err.status === 422) return err.message;
    if (err.status === 403) return "Tu usuario no tiene permiso para esta operación.";
  }
  return "No se pudo completar la operación. Intentá de nuevo.";
}

function tituloDe(panel: Panel): string {
  if (panel.modo === "vinculo") return "Vincular usuario existente";
  if (panel.modo === "edicion") return `Editar ${panel.persona.apellido}, ${panel.persona.nombre}`;
  return "Nueva persona";
}

/**
 * Personas (ADMIN): ABM con cuota, servicios y filtro de deuda, más "Operar como" (RF-39). Contenedor:
 * consulta la API, decide qué modal mostrar y refresca el listado después de cada cambio. La tabla
 * y el formulario son presentacionales. "Consultorio" se filtra acá (con las especialidades que
 * ya trae cada persona); "Gimnasio" y "Con deuda" los resuelve el servidor.
 */
export function PersonasPage() {
  const navigate = useNavigate();
  const { operarComo } = useAuth();
  const { mostrar } = useToast();
  const [filtro, setFiltro] = useState<FiltroPersonas>("TODOS");
  const [texto, setTexto] = useState("");
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [cargandoLista, setCargandoLista] = useState(true);
  const [errorLista, setErrorLista] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>({ modo: "cerrado" });
  const [errorPanel, setErrorPanel] = useState<string | null>(null);
  /** El vínculo no encontró el email: se ofrece seguir con el alta presencial (W-07). */
  const [sinUsuario, setSinUsuario] = useState(false);
  const [guardando, setGuardando] = useState(false);

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
    setSinUsuario(false);
    setPanel(nuevo);
  }

  const cerrar = useCallback(() => setPanel({ modo: "cerrado" }), []);

  async function guardar(values: PersonaFormValues) {
    setGuardando(true);
    setErrorPanel(null);
    setSinUsuario(false);
    try {
      const persona =
        panel.modo === "edicion"
          ? await personasApi.actualizarPersona(panel.persona.id, values.datos)
          : panel.modo === "vinculo"
            ? await personasApi.vincularPersona({ email: values.email, datos: values.datos })
            : await personasApi.crearPersona(values);
      mostrar(
        panel.modo === "edicion"
          ? "Cambios guardados"
          : panel.modo === "vinculo"
            ? `${persona.nombre} ${persona.apellido} quedó vinculada a su cuenta`
            : `${persona.nombre} ${persona.apellido} se agregó a Personas`,
      );
      cerrar();
      await cargar(filtro, texto);
    } catch (err) {
      if (panel.modo === "vinculo" && err instanceof ApiError && err.status === 404) {
        setErrorPanel("No existe un usuario registrado con ese email.");
        setSinUsuario(true);
      } else {
        setErrorPanel(mensajeDeError(err));
      }
    } finally {
      setGuardando(false);
    }
  }

  async function cambiarEstado(persona: Persona, accion: "baja" | "reactivar") {
    setGuardando(true);
    try {
      const actualizada =
        accion === "baja"
          ? await personasApi.darDeBajaPersona(persona.id)
          : await personasApi.reactivarPersona(persona.id);
      mostrar(
        accion === "baja"
          ? `${actualizada.nombre} ${actualizada.apellido} quedó dada de baja`
          : `${actualizada.nombre} ${actualizada.apellido} volvió a estar activa`,
      );
      await cargar(filtro, texto);
    } catch (err) {
      setErrorLista(mensajeDeError(err));
    } finally {
      setGuardando(false);
    }
  }

  async function operar(persona: Persona) {
    setGuardando(true);
    setErrorLista(null);
    try {
      await operarComo(persona.id);
      navigate("/socio/inicio");
    } catch (err) {
      setErrorLista(mensajeDeError(err));
      setGuardando(false);
    }
  }

  const visibles =
    filtro === "CONSULTORIO" ? personas.filter((p) => p.especialidades.length > 0) : personas;

  return (
    <>
      <PageHeader
        eyebrow="Recepción"
        titulo="Personas"
        subtitulo="Socios y pacientes del centro."
      />
      <div className="flex flex-col gap-3.5">
        <div className="flex flex-wrap gap-2.5">
          <Buscador
            aria-label="Buscar por nombre, apellido o DNI"
            placeholder="Buscar por nombre o DNI"
            value={texto}
            onChange={setTexto}
            className="min-w-0 flex-[1_1_240px]"
          />
          <Button type="button" esquinas="lg" onClick={() => abrir({ modo: "alta" })}>
            + Nueva persona
          </Button>
          <Button
            type="button"
            variant="neutral"
            esquinas="lg"
            onClick={() => abrir({ modo: "vinculo" })}
          >
            Vincular usuario existente
          </Button>
        </div>

        <FiltroPildoras
          etiqueta="Filtrar personas"
          opciones={FILTROS}
          valor={filtro}
          onChange={setFiltro}
        />

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
              personas={visibles}
              ocupado={guardando}
              onEditar={(p) => abrir({ modo: "edicion", persona: p })}
              onBaja={(p) => void cambiarEstado(p, "baja")}
              onReactivar={(p) => void cambiarEstado(p, "reactivar")}
              onOperarComo={(p) => void operar(p)}
            />
          )}
        </section>
      </div>

      {panel.modo !== "cerrado" && (
        <Modal titulo={tituloDe(panel)} onClose={cerrar}>
          <PersonaForm
            key={panel.modo === "edicion" ? panel.persona.id : panel.modo}
            persona={panel.modo === "edicion" ? panel.persona : undefined}
            modo={panel.modo === "vinculo" ? "vinculo" : "alta"}
            onSubmit={(values) => void guardar(values)}
            onCancel={cerrar}
            error={errorPanel}
            cargando={guardando}
          />
          {sinUsuario && (
            <Button
              type="button"
              variant="neutral"
              size="modal"
              onClick={() => abrir({ modo: "alta" })}
            >
              Crear con credenciales nuevas →
            </Button>
          )}
        </Modal>
      )}
    </>
  );
}
