import { useEffect, useState } from "react";
import { ApiError } from "../api/http";
import { estadoGym, proximaAgenda, reservarConsultorio, slotsDisponibles } from "../api/turnosApi";
import { Button } from "../components/atoms/Button";
import { Aviso } from "../components/molecules/Aviso";
import { PageHeader } from "../components/molecules/PageHeader";
import { ProfesionalCard } from "../components/molecules/ProfesionalCard";
import { Stepper } from "../components/molecules/Stepper";
import { SlotsConsultorioGrid } from "../components/organisms/SlotsConsultorioGrid";
import { useAhora } from "../hooks/useAhora";
import { useCarga } from "../hooks/useCarga";
import { useToast } from "../hooks/useToast";
import type { SlotConsultorio } from "../types/turno";
import { fechaDiaMes, fechaLargaDe, fechaRelativa } from "../utils/diasUi";
import { mensajeDeError } from "../utils/errores";
import { fechaBA, horaBA, hoyBA } from "../utils/fechaBA";
import { etiquetaEspecialidad, nombreProfesional } from "../utils/formato";
import { Cargando } from "../components/molecules/Cargando";

/**
 * Turno de consultorio (W-02, RF-41): paso 1 elige un profesional entre las tarjetas (cada una con
 * su próxima agenda, calculada por el backend); paso 2 muestra los horarios de ese día y una barra
 * "Confirmar turno". Los horarios que no están libres no responden. Un 409 (otra persona lo tomó
 * primero) recarga los horarios y avisa. No se evalúa morosidad (RN-01): con deuda solo se avisa
 * que las consultas siguen habilitadas.
 */
export function ReservarConsultorioPage() {
  const ahora = useAhora();
  const hoy = hoyBA(ahora);
  const { mostrar } = useToast();

  const agendas = useCarga(proximaAgenda);
  const gym = useCarga(estadoGym);
  const [profesionalId, setProfesionalId] = useState<number | null>(null);
  const [slots, setSlots] = useState<{ clave: string; lista: SlotConsultorio[] } | null>(null);
  const [errorSlots, setErrorSlots] = useState<string | null>(null);
  const [seleccion, setSeleccion] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [recarga, setRecarga] = useState(0);

  const agenda = agendas.datos?.find((a) => a.profesionalId === profesionalId) ?? null;
  const fecha = agenda?.fecha ?? null;
  const clave = `${profesionalId}|${fecha}`;

  useEffect(() => {
    if (profesionalId === null || fecha === null) return;
    let vigente = true;
    slotsDisponibles(profesionalId, fecha)
      .then((lista) => {
        if (!vigente) return;
        setSlots({ clave: `${profesionalId}|${fecha}`, lista });
        setErrorSlots(null);
      })
      .catch((err: unknown) => {
        if (vigente) setErrorSlots(mensajeDeError(err));
      });
    return () => {
      vigente = false;
    };
  }, [profesionalId, fecha, recarga]);

  const lista = slots?.clave === clave ? slots.lista : null;
  const slotElegido = lista?.find((s) => s.inicio === seleccion) ?? null;
  const conDeuda = (gym.datos?.periodosImpagos ?? 0) > 0;

  function elegirProfesional(id: number) {
    setProfesionalId(id);
    setSeleccion(null);
    setError(null);
  }

  async function confirmar() {
    if (!agenda || !seleccion) return;
    setEnviando(true);
    setError(null);
    try {
      await reservarConsultorio(agenda.profesionalId, seleccion);
      mostrar(
        `Turno confirmado: ${etiquetaEspecialidad(agenda.especialidad)}, ${fechaDiaMes(fechaBA(seleccion))} ${horaBA(seleccion)}`,
      );
      setProfesionalId(null);
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 409
          ? "Ese horario ya fue tomado por otra persona. Elegí otro."
          : mensajeDeError(err),
      );
    } finally {
      setSeleccion(null);
      setEnviando(false);
      setRecarga((r) => r + 1);
      agendas.recargar();
    }
  }

  // Primera carga: pantalla completa, sin cabecera ni datos todavía.
  if (agendas.datos === null && !agendas.error) return <Cargando variante="pantalla" />;

  return (
    <>
      <PageHeader
        eyebrow="Consultorios"
        titulo="Turno de consultorio"
        subtitulo="Elegí la especialidad y un horario libre."
      />
      <div className="flex flex-col gap-4">
        {conDeuda && (
          <div className="rounded-lg bg-clin-soft px-4 py-3 text-[13.5px] text-clin-ink">
            Tenés períodos impagos de gimnasio, pero las consultas siguen habilitadas.
          </div>
        )}
        {error && <Aviso tono="bad">{error}</Aviso>}
        {agendas.error && (
          <Aviso tono="bad" titulo="No pudimos cargar los profesionales">
            {agendas.error}
          </Aviso>
        )}
        {agendas.error && (
          <Button type="button" variant="outline" className="self-start" onClick={agendas.recargar}>
            Reintentar
          </Button>
        )}

        {agendas.datos !== null && agendas.datos.length === 0 && (
          <p className="text-sm text-ink-2">
            Por ahora no hay profesionales con agenda disponible.
          </p>
        )}

        {agendas.datos !== null && agendas.datos.length > 0 && (
          <>
            <Stepper pasos={["Especialidad", "Horario"]} actual={agenda ? 2 : 1} />
            <ul
              aria-label="Profesionales"
              className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))] gap-2.5"
            >
              {agendas.datos.map((a) => (
                <li key={a.profesionalId} className="flex">
                  <ProfesionalCard
                    agenda={a}
                    hoy={hoy}
                    activo={a.profesionalId === profesionalId}
                    onElegir={elegirProfesional}
                  />
                </li>
              ))}
            </ul>
          </>
        )}

        {agenda && fecha && (
          <section className="flex flex-col gap-3.5 rounded-xl border border-border bg-surface p-[18px]">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-semibold tracking-[0.06em] text-ink-3 uppercase">
                Próximo día con agenda
              </span>
              <h2 className="font-heading text-lg font-semibold text-ink">
                {`${fechaLargaDe(fecha)} · ${fechaRelativa(fecha, hoy)}`}
              </h2>
              <span className="text-[13px] text-ink-2">
                {`${nombreProfesional(agenda)} · ${etiquetaEspecialidad(agenda.especialidad)} · ${agenda.duracionTurnoMinutos} min`}
              </span>
            </div>
            {errorSlots && <Aviso tono="bad">{errorSlots}</Aviso>}
            {lista === null && !errorSlots && <Cargando texto="Cargando horarios…" />}
            {lista !== null && lista.length === 0 && (
              <p className="text-sm text-ink-2">
                Este profesional no tiene horarios para este día.
              </p>
            )}
            {lista !== null && lista.length > 0 && (
              <SlotsConsultorioGrid
                slots={lista}
                seleccionado={seleccion}
                ahora={ahora}
                onElegir={setSeleccion}
              />
            )}
            <span className="text-[12.5px] text-ink-3">
              Cancelación en término hasta 24 h antes. Después queda como “cancelado fuera de
              término”.
            </span>
          </section>
        )}

        {agenda && slotElegido && (
          <div className="sticky bottom-[76px] z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border-[1.5px] border-clin bg-surface px-4 py-3.5 shadow-[0_8px_28px_rgba(0,0,0,0.14)] shell:bottom-5">
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="text-xs font-semibold tracking-wider text-clin-ink uppercase">
                {etiquetaEspecialidad(agenda.especialidad)}
              </span>
              <span className="font-semibold text-ink">
                {`${fechaLargaDe(fechaBA(slotElegido.inicio))} · ${horaBA(slotElegido.inicio)} – ${horaBA(slotElegido.fin)}`}
              </span>
              <span className="text-[12.5px] text-ink-3">
                {`${nombreProfesional(agenda)} · ${agenda.duracionTurnoMinutos} min`}
              </span>
            </div>
            <div className="flex flex-[1_0_auto] justify-end gap-2">
              <Button
                type="button"
                size="modal"
                variant="neutral"
                className="px-3.5! font-normal!"
                onClick={() => setSeleccion(null)}
              >
                Cambiar
              </Button>
              <Button
                type="button"
                size="modal"
                className="px-5!"
                cargando={enviando}
                textoCargando="Reservando…"
                onClick={() => void confirmar()}
              >
                Confirmar turno
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
