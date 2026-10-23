import { useEffect, useState } from "react";
import { cupoGym, estadoGym, misTurnos, reservarGym } from "../api/turnosApi";
import { Button } from "../components/atoms/Button";
import { Aviso, type TonoAviso } from "../components/molecules/Aviso";
import { SelectorDias, type DiaSelector } from "../components/molecules/SelectorDias";
import { CupoGimnasioGrid } from "../components/organisms/CupoGimnasioGrid";
import { PageHeader } from "../components/molecules/PageHeader";
import { useAhora } from "../hooks/useAhora";
import { useFeriados } from "../hooks/useFeriados";
import type { EstadoGym, FranjaGym, Turno } from "../types/turno";
import { abreviaturaDia, fechaCorta, fechaLargaDe, numeroDia } from "../utils/diasUi";
import { mensajeDeError } from "../utils/errores";
import { diaSemana, fechaBA, horaBA, hoyBA, sumarDias } from "../utils/fechaBA";

const DIAS_VISIBLES = 7;

interface MensajeUi {
  tono: TonoAviso;
  texto: string;
}

/**
 * Reservar gimnasio (W-08 / W-02). Primero consulta el estado del socio: si no es socio de
 * gimnasio o está suspendido, muestra el bloqueo y NO renderiza días ni franjas. El selector de
 * 7 días es solo comodidad de la UI; el backend valida cada reserva (409/422 → mensaje + recarga).
 */
export function ReservarGimnasioPage() {
  const ahora = useAhora();
  const hoy = hoyBA(ahora);

  const [estado, setEstado] = useState<EstadoGym | null>(null);
  const [errorEstado, setErrorEstado] = useState<string | null>(null);
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [elegida, setElegida] = useState<string | null>(null);
  const [cupo, setCupo] = useState<{ fecha: string; franjas: FranjaGym[] } | null>(null);
  const [errorCupo, setErrorCupo] = useState<string | null>(null);
  const [seleccion, setSeleccion] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<MensajeUi | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [recarga, setRecarga] = useState(0);

  const fecha = elegida ?? hoy;
  const anioHoy = Number(hoy.slice(0, 4));
  const anioFin = Number(sumarDias(hoy, DIAS_VISIBLES - 1).slice(0, 4));
  const feriadosHoy = useFeriados(anioHoy);
  const feriadosFin = useFeriados(anioFin === anioHoy ? null : anioFin);
  const feriadoDe = (f: string) =>
    (Number(f.slice(0, 4)) === anioHoy ? feriadosHoy : feriadosFin).feriadoDe(f);

  const bloqueado = estado !== null && (!estado.esSocioGym || estado.suspendido);
  const feriado = feriadoDe(fecha);
  const feriadoCierra = feriado?.cierraGimnasio === true;
  const domingo = diaSemana(fecha) === 7;
  const cerrada = domingo || feriadoCierra;
  const puedeVerCupo = estado !== null && !bloqueado && !cerrada;

  useEffect(() => {
    let vigente = true;
    estadoGym()
      .then((e) => {
        if (vigente) setEstado(e);
      })
      .catch((err: unknown) => {
        if (vigente) setErrorEstado(mensajeDeError(err));
      });
    return () => {
      vigente = false;
    };
  }, []);

  useEffect(() => {
    let vigente = true;
    misTurnos()
      .then((lista) => {
        if (vigente) setTurnos(lista);
      })
      .catch(() => undefined); // solo alimenta una pista; el backend valida igual
    return () => {
      vigente = false;
    };
  }, [recarga]);

  useEffect(() => {
    if (!puedeVerCupo) return;
    let vigente = true;
    cupoGym(fecha)
      .then((franjas) => {
        if (!vigente) return;
        setCupo({ fecha, franjas });
        setErrorCupo(null);
      })
      .catch((err: unknown) => {
        if (vigente) setErrorCupo(mensajeDeError(err));
      });
    return () => {
      vigente = false;
    };
  }, [fecha, puedeVerCupo, recarga]);

  const tuTurnoDe = (f: string): string | null =>
    turnos.find((t) => t.tipoTurno === "GYM" && t.estado === "RESERVADO" && fechaBA(t.inicio) === f)
      ?.inicio ?? null;

  const dias: DiaSelector[] = Array.from({ length: DIAS_VISIBLES }, (_, i) => {
    const f = sumarDias(hoy, i);
    const cierraFeriado = feriadoDe(f)?.cierraGimnasio === true;
    const cerradoDia = diaSemana(f) === 7 || cierraFeriado;
    let sub = "";
    if (cierraFeriado) sub = "Feriado";
    else if (diaSemana(f) === 7) sub = "Cerrado";
    else if (tuTurnoDe(f)) sub = "Tu turno";
    else if (i === 0) sub = "Hoy";
    return { fecha: f, dow: abreviaturaDia(f), num: numeroDia(f), sub, cerrado: cerradoDia };
  });

  const franjas = cupo?.fecha === fecha ? cupo.franjas : null;
  // Cupo y horario del día salen de la grilla del backend, no de constantes de la pantalla.
  const cupoPorFranja = franjas?.[0]?.cupo ?? null;
  const horario =
    franjas && franjas.length > 0
      ? `${horaBA(franjas[0].inicio)} – ${horaBA(franjas[franjas.length - 1].fin)}`
      : null;
  const franjaElegida = franjas?.find((f) => f.inicio === seleccion) ?? null;

  function elegirDia(f: string) {
    setElegida(f);
    setSeleccion(null);
    setMensaje(null);
  }

  async function confirmar() {
    if (!seleccion) return;
    setEnviando(true);
    setMensaje(null);
    try {
      await reservarGym(seleccion);
      setMensaje({
        tono: "ok",
        texto: `Listo, reservaste gimnasio el ${fechaCorta(fechaBA(seleccion))} a las ${horaBA(seleccion)}.`,
      });
    } catch (err) {
      setMensaje({ tono: "bad", texto: mensajeDeError(err) });
    } finally {
      setSeleccion(null);
      setEnviando(false);
      setRecarga((r) => r + 1);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Gimnasio"
        titulo="Reservar gimnasio"
        subtitulo="Elegí un día y una franja de 60 minutos."
      />
      <div className="flex flex-col gap-4">
        {errorEstado && <Aviso tono="bad">{errorEstado}</Aviso>}
        {estado === null && !errorEstado && <p className="text-sm text-ink-3">Cargando…</p>}

        {estado && !estado.esSocioGym && (
          <Aviso tono="bad" titulo="No tenés el servicio de gimnasio activo">
            Acercate a recepción para sumarlo a tu cuenta. Tus consultas siguen igual.
          </Aviso>
        )}
        {estado && estado.esSocioGym && estado.suspendido && (
          <Aviso tono="bad" titulo="Reserva de gimnasio suspendida">
            Alcanzaste el límite de períodos impagos y la reserva de gimnasio está suspendida. Las
            consultas siguen habilitadas.
          </Aviso>
        )}
        {estado?.esSocioGym && estado.excepcionVigente && (
          <Aviso tono="warn" titulo="Excepción autorizada por Recepción.">
            Podés reservar aunque tengas períodos impagos.
          </Aviso>
        )}

        {mensaje && <Aviso tono={mensaje.tono}>{mensaje.texto}</Aviso>}

        {estado && !bloqueado && (
          <>
            <ul className="flex flex-wrap gap-1.5 text-xs text-ink-2">
              {[
                "Lun a vie 07–22 · Sáb 09–13",
                `Franjas de 60 min${cupoPorFranja ? ` · cupo ${cupoPorFranja}` : ""}`,
                "1 turno por día",
                "Hasta 7 días antes y 1 h antes",
              ].map((r) => (
                <li key={r} className="rounded-full border border-border bg-surface px-2.5 py-1">
                  {r}
                </li>
              ))}
            </ul>

            <SelectorDias dias={dias} activa={fecha} onElegir={elegirDia} tono="gym" />

            <div className="flex flex-wrap items-baseline justify-between gap-1.5">
              <h2 className="font-heading text-lg font-semibold text-ink">
                {fechaLargaDe(fecha)}
                {fecha === hoy ? " · hoy" : ""}
              </h2>
              {(cerrada || horario) && (
                <span className="font-mono text-caption text-ink-3">
                  {cerrada ? "Cerrado" : horario}
                </span>
              )}
            </div>

            {feriadoCierra && feriado && (
              <div className="rounded-xl border border-dashed border-border-2 px-4 py-6 text-center text-ink-2">{`Feriado: ${feriado.descripcion}. El gimnasio está cerrado.`}</div>
            )}
            {!feriadoCierra && domingo && (
              <div className="rounded-xl border border-dashed border-border-2 px-5 py-9 text-center text-ink-2">
                Los domingos el gimnasio está cerrado.
              </div>
            )}
            {errorCupo && !cerrada && <Aviso tono="bad">{errorCupo}</Aviso>}
            {puedeVerCupo && franjas === null && !errorCupo && (
              <p className="text-sm text-ink-3">Cargando franjas…</p>
            )}
            {puedeVerCupo && franjas !== null && franjas.length === 0 && (
              <p className="text-sm text-ink-2">No hay franjas para este día.</p>
            )}
            {puedeVerCupo && franjas !== null && franjas.length > 0 && (
              <CupoGimnasioGrid
                franjas={franjas}
                ahora={ahora}
                tuTurno={tuTurnoDe(fecha)}
                seleccionada={seleccion}
                onElegir={setSeleccion}
              />
            )}

            {franjaElegida && (
              <div className="sticky bottom-[76px] z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border-[1.5px] border-gym bg-surface px-4 py-3.5 shadow-[0_8px_28px_rgba(0,0,0,0.14)] shell:bottom-5">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-xs font-semibold tracking-wider text-gym-ink uppercase">
                    Gimnasio
                  </span>
                  <span className="font-semibold text-ink">
                    {`${fechaLargaDe(fecha)} · ${horaBA(franjaElegida.inicio)} – ${horaBA(franjaElegida.fin)}`}
                  </span>
                  <span className="text-[12.5px] text-ink-3">
                    Cancelás en término hasta 2 h antes.
                  </span>
                </div>
                <div className="flex flex-[1_0_auto] justify-end gap-2">
                  <Button
                    size="modal"
                    type="button"
                    variant="neutral"
                    className="px-3.5! font-normal!"
                    onClick={() => setSeleccion(null)}
                  >
                    Cambiar
                  </Button>
                  <Button
                    variant="gym"
                    size="modal"
                    className="px-5!"
                    type="button"
                    disabled={enviando}
                    onClick={confirmar}
                  >
                    Confirmar reserva
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
