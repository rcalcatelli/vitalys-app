import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ApiError } from "../api/http";
import * as profesionalesApi from "../api/profesionalesApi";
import { FieldError } from "../components/atoms/FieldError";
import { Label } from "../components/atoms/Label";
import { Select } from "../components/atoms/Select";
import { Modal } from "../components/molecules/Modal";
import { ConfirmarImpactoDialog } from "../components/organisms/ConfirmarImpactoDialog";
import { FranjasEditor } from "../components/organisms/FranjasEditor";
import { SemanaGrid } from "../components/organisms/SemanaGrid";
import { PageHeader } from "../components/molecules/PageHeader";
import { useAuth } from "../context/AuthContext";
import type { FranjaEditable } from "../types/disponibilidad";
import type { Impacto, Profesional } from "../types/profesional";
import { aEditables, mismoConjunto, sinClaves, validarFranjas } from "../utils/disponibilidad";
import { etiquetaEspecialidad, nombreProfesional } from "../utils/formato";

function mensajeDeError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 404 || err.status === 409 || err.status === 400) return err.message;
    if (err.status === 403) return "Tu usuario no tiene permiso para esta operación.";
  }
  return "No se pudo completar la operación. Intentá de nuevo.";
}

let contadorFilas = 0;
const nuevaClave = () => `n${++contadorFilas}`;

/**
 * Disponibilidad semanal (RF-14, RN-11, RN-24). La usan dos roles:
 *  - PROFESIONAL (`/profesional/disponibilidad`): edita la suya, resuelta con `GET /api/profesionales/me`.
 *  - ADMIN (`/admin/profesionales/:id/disponibilidad`): edita la de cualquier profesional activo,
 *    con botón para volver al listado y selector de profesional.
 *
 * Contenedor: mantiene el borrador local y valida el solapamiento antes de habilitar Guardar.
 * Al guardar consulta el impacto (POST …/impacto); si el conjunto deja turnos futuros sin
 * cobertura pide confirmación y recién entonces hace el PUT con `confirmar=true`. Si el servidor
 * contesta 409 con impacto (carrera entre la vista previa y el guardado) muestra el mismo modal.
 */
export function DisponibilidadPage() {
  const { rol } = useAuth();
  const esAdmin = rol === "ADMIN";
  const { id } = useParams();
  const navigate = useNavigate();

  const [profesional, setProfesional] = useState<Profesional | null>(null);
  const [todos, setTodos] = useState<Profesional[]>([]);
  const [guardadas, setGuardadas] = useState<FranjaEditable[]>([]);
  const [borrador, setBorrador] = useState<FranjaEditable[] | null>(null);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [confirmacion, setConfirmacion] = useState<Impacto | null>(null);

  useEffect(() => {
    let cancelado = false;
    async function cargar() {
      setCargando(true);
      setErrorCarga(null);
      setBorrador(null);
      setConfirmacion(null);
      setError(null);
      setAviso(null);
      try {
        let pro: Profesional | undefined;
        if (esAdmin) {
          const lista = await profesionalesApi.listarProfesionales();
          if (cancelado) return;
          setTodos(lista);
          pro = lista.find((p) => p.id === Number(id));
          if (!pro) throw new ApiError(404, "No encontramos a ese profesional.");
        } else {
          pro = await profesionalesApi.miPerfilProfesional();
        }
        const franjas = await profesionalesApi.listarFranjas(pro.id);
        if (cancelado) return;
        setProfesional(pro);
        setGuardadas(aEditables(franjas));
      } catch (err) {
        if (!cancelado) {
          setProfesional(null);
          setErrorCarga(mensajeDeError(err));
        }
      } finally {
        if (!cancelado) setCargando(false);
      }
    }
    void cargar();
    return () => {
      cancelado = true;
    };
  }, [esAdmin, id]);

  const filas = borrador ?? guardadas;
  const errores = validarFranjas(filas);
  const hayErrores = Object.keys(errores).length > 0;
  const hayCambios = borrador !== null && !mismoConjunto(borrador, guardadas);

  function editar(transformar: (actuales: FranjaEditable[]) => FranjaEditable[]) {
    setAviso(null);
    setBorrador((previo) => transformar(previo ?? guardadas));
  }

  async function aplicar(
    franjas: ReturnType<typeof sinClaves>,
    confirmar: boolean,
    cancelados: number,
  ) {
    if (!profesional) return;
    setGuardando(true);
    setError(null);
    try {
      const guardadasNuevas = await profesionalesApi.reemplazarDisponibilidad(
        profesional.id,
        franjas,
        confirmar,
      );
      setGuardadas(aEditables(guardadasNuevas));
      setBorrador(null);
      setConfirmacion(null);
      setAviso(
        cancelados > 0
          ? `Disponibilidad guardada · ${cancelados} ${cancelados === 1 ? "turno cancelado" : "turnos cancelados"}`
          : "Disponibilidad guardada",
      );
    } catch (err) {
      // Carrera: entre la vista previa y el guardado cambió el impacto. Se pide confirmar el nuevo.
      const impacto = profesionalesApi.impactoDeError(err);
      if (impacto) setConfirmacion(impacto);
      else setError(mensajeDeError(err));
    } finally {
      setGuardando(false);
    }
  }

  async function guardar() {
    if (!profesional || !borrador || hayErrores) return;
    const franjas = sinClaves(borrador);
    setGuardando(true);
    setError(null);
    try {
      const impacto = await profesionalesApi.impactoDeDisponibilidad(profesional.id, franjas);
      if (impacto.cantidad > 0) {
        setConfirmacion(impacto);
        return;
      }
    } catch (err) {
      setError(mensajeDeError(err));
      return;
    } finally {
      setGuardando(false);
    }
    await aplicar(franjas, false, 0);
  }

  const nota = hayErrores
    ? "Hay franjas que se superponen o son inválidas. Corregilas para poder guardar."
    : "Las franjas de un mismo día no pueden superponerse. Si achicás una franja con turnos reservados, te vamos a pedir confirmación.";

  const eyebrow = esAdmin
    ? "Recepción"
    : profesional
      ? `${nombreProfesional(profesional)} · ${etiquetaEspecialidad(profesional.especialidad)}`
      : "Profesional";

  return (
    <>
      <PageHeader
        eyebrow={eyebrow}
        titulo="Disponibilidad"
        subtitulo={
          esAdmin
            ? "Elegí el profesional y editá sus franjas semanales."
            : "Tus franjas semanales de atención."
        }
      />
      <div className="flex flex-col gap-4">
        {esAdmin && (
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => navigate("/admin/profesionales")}
              className="h-10 self-start font-semibold text-clin-ink"
            >
              ← Profesionales
            </button>
            {profesional && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-border bg-surface px-3.5 py-3">
                <Label htmlFor="disponibilidad-profesional" className="font-semibold">
                  Profesional:
                </Label>
                <Select
                  id="disponibilidad-profesional"
                  className="flex-[1_1_240px]"
                  value={String(profesional.id)}
                  onChange={(v) => navigate(`/admin/profesionales/${v}/disponibilidad`)}
                >
                  {todos
                    .filter((p) => p.activo || p.id === profesional.id)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {nombreProfesional(p)} · {etiquetaEspecialidad(p.especialidad)}
                        {p.activo ? "" : " (inactivo)"}
                      </option>
                    ))}
                </Select>
              </div>
            )}
          </div>
        )}

        {cargando && <p className="text-sm text-ink-3">Cargando disponibilidad…</p>}
        {errorCarga && <FieldError>{errorCarga}</FieldError>}

        {profesional && !cargando && (
          <>
            {aviso && (
              <div role="status" className="rounded-md bg-ok-soft px-3 py-2.5 text-sm text-ok-ink">
                {aviso}
              </div>
            )}

            <div
              className={[
                "rounded-lg px-4 py-3 text-[13.5px]",
                hayErrores ? "bg-bad-soft text-bad-ink" : "bg-clin-soft text-clin-ink",
              ].join(" ")}
            >
              {nota}
            </div>

            {error && !confirmacion && <FieldError>{error}</FieldError>}

            <div className="flex flex-wrap items-start gap-4">
              <FranjasEditor
                filas={filas}
                errores={errores}
                hayCambios={hayCambios}
                guardando={guardando}
                onCambiar={(clave, cambio) =>
                  editar((actuales) =>
                    actuales.map((f) => (f.clave === clave ? { ...f, ...cambio } : f)),
                  )
                }
                onAgregar={() =>
                  editar((actuales) => [
                    ...actuales,
                    { clave: nuevaClave(), diaSemana: 5, horaInicio: "09:00", horaFin: "12:00" },
                  ])
                }
                onQuitar={(clave) =>
                  editar((actuales) => actuales.filter((f) => f.clave !== clave))
                }
                onDescartar={() => {
                  setBorrador(null);
                  setError(null);
                }}
                onGuardar={() => void guardar()}
              />
              <SemanaGrid
                filas={filas}
                errores={errores}
                duracionTurnoMinutos={profesional.duracionTurnoMinutos}
              />
            </div>
          </>
        )}

        {profesional && confirmacion && borrador && (
          <Modal titulo="Hay turnos afectados" onClose={() => setConfirmacion(null)}>
            <ConfirmarImpactoDialog
              impacto={confirmacion}
              esPropia={!esAdmin}
              profesional={nombreProfesional(profesional)}
              error={error}
              cargando={guardando}
              onConfirmar={() => void aplicar(sinClaves(borrador), true, confirmacion.cantidad)}
              onVolver={() => {
                setConfirmacion(null);
                setError(null);
              }}
            />
          </Modal>
        )}
      </div>
    </>
  );
}
