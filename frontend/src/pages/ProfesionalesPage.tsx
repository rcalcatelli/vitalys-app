import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError } from "../api/http";
import * as profesionalesApi from "../api/profesionalesApi";
import { Button } from "../components/atoms/Button";
import { FieldError } from "../components/atoms/FieldError";
import { Input } from "../components/atoms/Input";
import { AdminNav } from "../components/molecules/AdminNav";
import { Modal } from "../components/molecules/Modal";
import { BajaProfesionalDialog } from "../components/organisms/BajaProfesionalDialog";
import { ProfesionalForm } from "../components/organisms/ProfesionalForm";
import type { ProfesionalFormValues } from "../components/organisms/ProfesionalForm";
import { ProfesionalesTable } from "../components/organisms/ProfesionalesTable";
import { useAuth } from "../context/AuthContext";
import type { FiltroProfesionales, Impacto, Profesional } from "../types/profesional";
import { nombreProfesional } from "../utils/formato";

const FILTROS: [FiltroProfesionales, string][] = [
  ["TODOS", "Todos"],
  ["NUTRICION", "Nutrición"],
  ["PSICOLOGIA", "Psicología"],
  ["KINESIOLOGIA", "Kinesiología"],
  ["INACTIVOS", "Inactivos"],
];

type Modo =
  | { modo: "cerrado" }
  | { modo: "alta" }
  | { modo: "edicion"; profesional: Profesional }
  | { modo: "baja"; profesional: Profesional; impacto: Impacto | null };

function mensajeDeError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 409 || err.status === 400 || err.status === 404) return err.message;
    if (err.status === 403) return "Tu usuario no tiene permiso para esta operación.";
  }
  return "No se pudo completar la operación. Intentá de nuevo.";
}

function coincide(p: Profesional, filtro: FiltroProfesionales, texto: string): boolean {
  const q = texto.trim().toLowerCase();
  const porTexto =
    !q ||
    nombreProfesional(p).toLowerCase().includes(q) ||
    (p.email ?? "").toLowerCase().includes(q);
  if (!porTexto) return false;
  if (filtro === "TODOS") return true;
  if (filtro === "INACTIVOS") return !p.activo;
  return p.especialidad === filtro;
}

/**
 * Pantalla de Profesionales (ADMIN, RF-11..RF-13 / RN-25). Contenedor: consulta la API,
 * decide qué modal mostrar (alta/edición/baja en dos pasos) y refresca el listado tras cada
 * cambio. La tabla, el formulario y el diálogo de baja son presentacionales. La búsqueda y
 * los filtros se resuelven en el cliente: el listado completo es chico y el ADMIN ya lo ve entero.
 */
export function ProfesionalesPage() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const [profesionales, setProfesionales] = useState<Profesional[]>([]);
  const [cargandoLista, setCargandoLista] = useState(true);
  const [errorLista, setErrorLista] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<FiltroProfesionales>("TODOS");
  const [texto, setTexto] = useState("");
  const [modal, setModal] = useState<Modo>({ modo: "cerrado" });
  const [errorModal, setErrorModal] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargandoLista(true);
    try {
      setProfesionales(await profesionalesApi.listarProfesionales());
      setErrorLista(null);
    } catch (err) {
      setErrorLista(mensajeDeError(err));
    } finally {
      setCargandoLista(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const cerrar = useCallback(() => setModal({ modo: "cerrado" }), []);

  function abrir(nuevo: Modo) {
    setErrorModal(null);
    setAviso(null);
    setModal(nuevo);
  }

  async function abrirBaja(profesional: Profesional) {
    abrir({ modo: "baja", profesional, impacto: null });
    try {
      const impacto = await profesionalesApi.impactoDeBaja(profesional.id);
      setModal({ modo: "baja", profesional, impacto });
    } catch (err) {
      setErrorModal(mensajeDeError(err));
    }
  }

  async function guardar(values: ProfesionalFormValues) {
    if (modal.modo !== "alta" && modal.modo !== "edicion") return;
    setGuardando(true);
    setErrorModal(null);
    try {
      const profesional =
        modal.modo === "edicion"
          ? await profesionalesApi.actualizarProfesional(modal.profesional.id, values.datos)
          : await profesionalesApi.crearProfesional(values);
      setAviso(
        modal.modo === "edicion"
          ? "Cambios guardados"
          : `${nombreProfesional(profesional)} se agregó a Profesionales`,
      );
      cerrar();
      await cargar();
    } catch (err) {
      setErrorModal(mensajeDeError(err));
    } finally {
      setGuardando(false);
    }
  }

  async function confirmarBaja() {
    if (modal.modo !== "baja" || modal.impacto === null) return;
    const { profesional, impacto } = modal;
    setGuardando(true);
    setErrorModal(null);
    try {
      await profesionalesApi.darDeBajaProfesional(profesional.id, impacto.cantidad > 0);
      setAviso("Profesional dado de baja");
      cerrar();
      await cargar();
    } catch (err) {
      // Carrera: entre el paso 1 y el 2 aparecieron turnos nuevos. Se muestra el impacto actualizado.
      const nuevo = profesionalesApi.impactoDeError(err);
      if (nuevo) {
        setModal({ modo: "baja", profesional, impacto: nuevo });
        setErrorModal("Cambió la lista de turnos afectados. Revisala y confirmá de nuevo.");
      } else {
        setErrorModal(mensajeDeError(err));
      }
    } finally {
      setGuardando(false);
    }
  }

  const visibles = profesionales.filter((p) => coincide(p, filtro, texto));

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6 sm:px-6 sm:py-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold tracking-wider text-ink-3 uppercase">
            Administración
          </span>
          <h1 className="font-heading text-2xl font-semibold text-ink sm:text-3xl">
            Profesionales
          </h1>
          <p className="text-sm text-ink-2">Equipo del consultorio y su disponibilidad.</p>
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
          aria-label="Buscar por nombre o email"
          placeholder="Buscar por nombre o email"
          value={texto}
          onChange={setTexto}
          className="min-w-0 flex-[1_1_240px]"
        />
        <Button type="button" className="sm:w-auto" onClick={() => abrir({ modo: "alta" })}>
          + Nuevo profesional
        </Button>
      </div>

      <div className="flex gap-1.5 overflow-x-auto" role="group" aria-label="Filtrar profesionales">
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

      <section
        aria-label="Listado de profesionales"
        aria-busy={cargandoLista}
        className="flex flex-col gap-3"
      >
        {errorLista && <FieldError>{errorLista}</FieldError>}
        {cargandoLista && profesionales.length === 0 ? (
          <p className="text-sm text-ink-3">Cargando profesionales…</p>
        ) : (
          <ProfesionalesTable
            profesionales={visibles}
            ocupado={guardando}
            onDisponibilidad={(p) => navigate(`/admin/profesionales/${p.id}/disponibilidad`)}
            onEditar={(p) => abrir({ modo: "edicion", profesional: p })}
            onBaja={(p) => void abrirBaja(p)}
          />
        )}
      </section>

      {(modal.modo === "alta" || modal.modo === "edicion") && (
        <Modal
          titulo={modal.modo === "alta" ? "Nuevo profesional" : "Editar profesional"}
          onClose={cerrar}
        >
          <ProfesionalForm
            key={modal.modo === "edicion" ? modal.profesional.id : "alta"}
            profesional={modal.modo === "edicion" ? modal.profesional : undefined}
            onSubmit={(values) => void guardar(values)}
            onCancel={cerrar}
            error={errorModal}
            cargando={guardando}
          />
        </Modal>
      )}

      {modal.modo === "baja" && (
        <Modal titulo="Dar de baja" onClose={cerrar}>
          <BajaProfesionalDialog
            profesional={modal.profesional}
            impacto={modal.impacto}
            error={errorModal}
            cargando={guardando}
            onConfirmar={() => void confirmarBaja()}
            onVolver={cerrar}
          />
        </Modal>
      )}
    </main>
  );
}
