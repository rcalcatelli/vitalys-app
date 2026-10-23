import { useEffect, useState } from "react";
import { ApiError } from "../api/http";
import { listarProfesionales } from "../api/profesionalesApi";
import { reservarConsultorio, slotsDisponibles } from "../api/turnosApi";
import { Button } from "../components/atoms/Button";
import { Label } from "../components/atoms/Label";
import { Select } from "../components/atoms/Select";
import { Aviso, type TonoAviso } from "../components/molecules/Aviso";
import { Modal } from "../components/molecules/Modal";
import { SelectorDias, type DiaSelector } from "../components/molecules/SelectorDias";
import { SlotsConsultorioGrid } from "../components/organisms/SlotsConsultorioGrid";
import { PageHeader } from "../components/molecules/PageHeader";
import { useAhora } from "../hooks/useAhora";
import type { Especialidad, Profesional } from "../types/profesional";
import type { SlotConsultorio } from "../types/turno";
import { abreviaturaDia, fechaCorta, fechaLargaDe, numeroDia } from "../utils/diasUi";
import { mensajeDeError } from "../utils/errores";
import { fechaBA, horaBA, hoyBA, sumarDias } from "../utils/fechaBA";
import { ESPECIALIDADES, etiquetaEspecialidad, nombreProfesional } from "../utils/formato";

const DIAS_VISIBLES = 14;

interface MensajeUi {
  tono: TonoAviso;
  texto: string;
}

/**
 * Turno de consultorio (W-02): especialidad → profesional (solo activos) → día → horario → modal de
 * confirmación. Los horarios con `libre=false` no responden. Un 409 (otra persona lo tomó primero)
 * recarga los horarios y avisa; un 422 muestra el mensaje del servidor. No se evalúa morosidad.
 */
export function ReservarConsultorioPage() {
  const ahora = useAhora();
  const hoy = hoyBA(ahora);

  const [profesionales, setProfesionales] = useState<Profesional[] | null>(null);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [especialidad, setEspecialidad] = useState<Especialidad | "">("");
  const [profesionalId, setProfesionalId] = useState<number | null>(null);
  const [elegida, setElegida] = useState<string | null>(null);
  const [slots, setSlots] = useState<{
    clave: string;
    lista: SlotConsultorio[];
  } | null>(null);
  const [errorSlots, setErrorSlots] = useState<string | null>(null);
  const [seleccion, setSeleccion] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<MensajeUi | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [recarga, setRecarga] = useState(0);

  const fecha = elegida ?? hoy;
  const clave = `${profesionalId}|${fecha}`;

  useEffect(() => {
    let vigente = true;
    listarProfesionales()
      .then((lista) => {
        if (vigente) setProfesionales(lista.filter((p) => p.activo));
      })
      .catch((err: unknown) => {
        if (vigente) setErrorCarga(mensajeDeError(err));
      });
    return () => {
      vigente = false;
    };
  }, []);

  useEffect(() => {
    if (profesionalId === null) return;
    let vigente = true;
    const claveActual = `${profesionalId}|${fecha}`;
    slotsDisponibles(profesionalId, fecha)
      .then((lista) => {
        if (!vigente) return;
        setSlots({ clave: claveActual, lista });
        setErrorSlots(null);
      })
      .catch((err: unknown) => {
        if (vigente) setErrorSlots(mensajeDeError(err));
      });
    return () => {
      vigente = false;
    };
  }, [profesionalId, fecha, recarga]);

  const activas = profesionales ?? [];
  const especialidades = ESPECIALIDADES.filter((e) => activas.some((p) => p.especialidad === e));
  const delaEspecialidad = activas.filter((p) => p.especialidad === especialidad);
  const profesional = delaEspecialidad.find((p) => p.id === profesionalId) ?? null;
  const lista = slots?.clave === clave ? slots.lista : null;
  const slotElegido = lista?.find((s) => s.inicio === seleccion) ?? null;

  const dias: DiaSelector[] = Array.from({ length: DIAS_VISIBLES }, (_, i) => {
    const f = sumarDias(hoy, i);
    return {
      fecha: f,
      dow: abreviaturaDia(f),
      num: numeroDia(f),
      sub: i === 0 ? "Hoy" : "",
      cerrado: false,
    };
  });

  function elegirEspecialidad(valor: string) {
    setEspecialidad(valor as Especialidad | "");
    setProfesionalId(null);
    setSeleccion(null);
    setMensaje(null);
  }

  function elegirProfesional(id: number) {
    setProfesionalId(id);
    setSeleccion(null);
    setMensaje(null);
  }

  function elegirDia(f: string) {
    setElegida(f);
    setSeleccion(null);
    setMensaje(null);
  }

  async function confirmar() {
    if (!profesional || !seleccion) return;
    setEnviando(true);
    try {
      await reservarConsultorio(profesional.id, seleccion);
      setMensaje({
        tono: "ok",
        texto: `Turno confirmado: ${etiquetaEspecialidad(profesional.especialidad)}, ${fechaCorta(fechaBA(seleccion))} ${horaBA(seleccion)}.`,
      });
    } catch (err) {
      setMensaje({
        tono: "bad",
        texto:
          err instanceof ApiError && err.status === 409
            ? "Ese horario ya fue tomado por otra persona. Elegí otro."
            : mensajeDeError(err),
      });
    } finally {
      setSeleccion(null);
      setEnviando(false);
      setRecarga((r) => r + 1);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Consultorios"
        titulo="Turno de consultorio"
        subtitulo="Elegí la especialidad y un horario libre."
      />
      <div className="flex flex-col gap-4">
        {errorCarga && <Aviso tono="bad">{errorCarga}</Aviso>}
        {profesionales === null && !errorCarga && <p className="text-sm text-ink-3">Cargando…</p>}
        {mensaje && <Aviso tono={mensaje.tono}>{mensaje.texto}</Aviso>}

        {profesionales !== null && especialidades.length === 0 && (
          <p className="text-sm text-ink-2">
            Por ahora no hay profesionales con agenda disponible.
          </p>
        )}

        {especialidades.length > 0 && (
          <>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="especialidad">Especialidad</Label>
              <Select
                id="especialidad"
                value={especialidad}
                onChange={elegirEspecialidad}
                className="sm:max-w-xs"
              >
                <option value="">Elegí una especialidad</option>
                {especialidades.map((e) => (
                  <option key={e} value={e}>
                    {etiquetaEspecialidad(e)}
                  </option>
                ))}
              </Select>
            </div>

            {especialidad !== "" && (
              <ul
                aria-label="Profesionales"
                className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))] gap-2.5"
              >
                {delaEspecialidad.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      aria-pressed={p.id === profesionalId}
                      onClick={() => elegirProfesional(p.id)}
                      className={[
                        "flex w-full flex-col gap-1.5 rounded-2xl border-[1.5px] p-4 text-left",
                        p.id === profesionalId
                          ? "border-clin bg-clin-soft"
                          : "border-border bg-surface",
                      ].join(" ")}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="font-heading text-lg font-semibold text-ink">
                          {etiquetaEspecialidad(p.especialidad)}
                        </span>
                        <span className="rounded-md bg-clin-soft px-2 py-0.5 font-mono text-xs font-medium text-clin-ink">
                          {p.duracionTurnoMinutos} min
                        </span>
                      </span>
                      <span className="text-ink-2">{nombreProfesional(p)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {profesional && (
              <section className="flex flex-col gap-3.5 rounded-2xl border border-border bg-surface p-4">
                <SelectorDias dias={dias} activa={fecha} onElegir={elegirDia} tono="clin" />
                <h2 className="font-heading text-lg font-semibold text-ink">
                  {fechaLargaDe(fecha)}
                  {fecha === hoy ? " · hoy" : ""}
                </h2>
                <p className="text-sm text-ink-2">
                  {`${nombreProfesional(profesional)} · ${etiquetaEspecialidad(profesional.especialidad)} · ${profesional.duracionTurnoMinutos} min`}
                </p>
                {errorSlots && <Aviso tono="bad">{errorSlots}</Aviso>}
                {lista === null && !errorSlots && (
                  <p className="text-sm text-ink-3">Cargando horarios…</p>
                )}
                {lista !== null && lista.length === 0 && (
                  <p className="text-sm text-ink-2">
                    Este profesional no tiene horarios para este día.
                  </p>
                )}
                {lista !== null && lista.length > 0 && (
                  <SlotsConsultorioGrid
                    slots={lista}
                    seleccionado={seleccion}
                    onElegir={setSeleccion}
                  />
                )}
                <span className="text-xs text-ink-3">
                  Cancelación en término hasta 24 h antes. Después queda como “cancelado fuera de
                  término”.
                </span>
              </section>
            )}
          </>
        )}

        {profesional && slotElegido && (
          <Modal titulo="Confirmar turno" onClose={() => setSeleccion(null)}>
            <div className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-semibold tracking-wider text-clin-ink uppercase">
                {etiquetaEspecialidad(profesional.especialidad)}
              </span>
              <span className="font-semibold text-ink">{nombreProfesional(profesional)}</span>
              <span className="text-ink-2">
                {`${fechaLargaDe(fecha)} · ${horaBA(slotElegido.inicio)} – ${horaBA(slotElegido.fin)}`}
              </span>
            </div>
            <div className="flex gap-2">
              <Button size="md" type="button" variant="outline" onClick={() => setSeleccion(null)}>
                Cancelar
              </Button>
              <Button type="button" disabled={enviando} onClick={confirmar}>
                Confirmar turno
              </Button>
            </div>
          </Modal>
        )}
      </div>
    </>
  );
}
