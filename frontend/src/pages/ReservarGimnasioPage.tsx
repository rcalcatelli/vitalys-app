import { useEffect, useState } from "react";
import { cupoGym, estadoGym, misTurnos, reservarGym } from "../api/turnosApi";
import { Button } from "../components/atoms/Button";
import { Aviso, type TonoAviso } from "../components/molecules/Aviso";
import { SelectorDias, type DiaSelector } from "../components/molecules/SelectorDias";
import { SocioNav } from "../components/molecules/SocioNav";
import { CupoGimnasioGrid } from "../components/organisms/CupoGimnasioGrid";
import { PantallaLayout } from "../components/templates/PantallaLayout";
import { useAuth } from "../context/AuthContext";
import { useAhora } from "../hooks/useAhora";
import { useFeriados } from "../hooks/useFeriados";
import type { EstadoGym, FranjaGym, Turno } from "../types/turno";
import { abreviaturaDia, fechaCorta, fechaLargaDe, numeroDia } from "../utils/diasUi";
import { mensajeDeError } from "../utils/errores";
import { diaSemana, fechaBA, horaBA, hoyBA, sumarDias } from "../utils/fechaBA";
import { fechaLarga } from "../utils/formato";

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
  const { usuario, logout } = useAuth();
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
    <PantallaLayout
      eyebrow="Socio"
      titulo="Reservar gimnasio"
      subtitulo={fechaLarga(ahora.toISOString())}
      email={usuario?.email}
      onLogout={logout}
      nav={<SocioNav />}
    >
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
          Podés reservar aunque tu cuota esté vencida.
        </Aviso>
      )}

      {mensaje && <Aviso tono={mensaje.tono}>{mensaje.texto}</Aviso>}

      {estado && !bloqueado && (
        <>
          <ul className="flex flex-wrap gap-1.5 text-xs text-ink-2">
            {["Lun a vie 07–22 · Sáb 09–13", "Franjas de 60 min", "1 turno por día"].map((r) => (
              <li key={r} className="rounded-full border border-border bg-surface px-2.5 py-1">
                {r}
              </li>
            ))}
          </ul>

          <SelectorDias dias={dias} activa={fecha} onElegir={elegirDia} tono="gym" />

          <h2 className="font-heading text-lg font-semibold text-ink">
            {fechaLargaDe(fecha)}
            {fecha === hoy ? " · hoy" : ""}
          </h2>

          {feriadoCierra && feriado && (
            <Aviso tono="warn">{`Feriado: ${feriado.descripcion}. El gimnasio está cerrado.`}</Aviso>
          )}
          {!feriadoCierra && domingo && (
            <p className="text-sm text-ink-2">Cerrado. El gimnasio no abre los domingos.</p>
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
            <div className="sticky bottom-3 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border-[1.5px] border-gym bg-surface p-4 shadow-lg">
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="text-xs font-semibold tracking-wider text-gym-ink uppercase">
                  Gimnasio
                </span>
                <span className="font-semibold text-ink">
                  {`${fechaLargaDe(fecha)} · ${horaBA(franjaElegida.inicio)} – ${horaBA(franjaElegida.fin)}`}
                </span>
                <span className="text-xs text-ink-3">Cancelás en término hasta 2 h antes.</span>
              </div>
              <div className="flex gap-2">
                <Button
                  size="md"
                  type="button"
                  variant="outline"
                  onClick={() => setSeleccion(null)}
                >
                  Cambiar
                </Button>
                <Button variant="gym" type="button" disabled={enviando} onClick={confirmar}>
                  Confirmar reserva
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </PantallaLayout>
  );
}
