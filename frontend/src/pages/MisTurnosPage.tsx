import { useEffect, useState } from "react";
import { listarProfesionales } from "../api/profesionalesApi";
import { cancelarTurno, misTurnos } from "../api/turnosApi";
import { Aviso, type TonoAviso } from "../components/molecules/Aviso";
import { Modal } from "../components/molecules/Modal";
import { CancelarTurnoDialog } from "../components/organisms/CancelarTurnoDialog";
import { TurnosLista } from "../components/organisms/TurnosLista";
import { PageHeader } from "../components/molecules/PageHeader";
import { useAhora } from "../hooks/useAhora";
import type { Profesional } from "../types/profesional";
import type { Turno } from "../types/turno";
import { mensajeDeError } from "../utils/errores";
import { fechaLarga } from "../utils/formato";

interface MensajeUi {
  tono: TonoAviso;
  texto: string;
}

/**
 * Mis turnos (home del socio): próximos e historial con chip de estado y cancelación con motivo.
 * Contenedor: el nombre del profesional sale de `listarProfesionales()`; si falla o el profesional
 * ya no figura, la lista usa "Profesional no disponible" y sigue funcionando.
 */
export function MisTurnosPage() {
  const ahora = useAhora();

  const [turnos, setTurnos] = useState<Turno[] | null>(null);
  const [profesionales, setProfesionales] = useState<Profesional[]>([]);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [aCancelar, setACancelar] = useState<Turno | null>(null);
  const [cancelando, setCancelando] = useState(false);
  const [mensaje, setMensaje] = useState<MensajeUi | null>(null);
  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    let vigente = true;
    listarProfesionales()
      .then((lista) => {
        if (vigente) setProfesionales(lista);
      })
      .catch(() => undefined); // solo resuelve nombres; hay etiqueta de respaldo
    return () => {
      vigente = false;
    };
  }, []);

  useEffect(() => {
    let vigente = true;
    misTurnos()
      .then((lista) => {
        if (!vigente) return;
        setTurnos(lista);
        setErrorCarga(null);
      })
      .catch((err: unknown) => {
        if (vigente) setErrorCarga(mensajeDeError(err));
      });
    return () => {
      vigente = false;
    };
  }, [recarga]);

  async function confirmarCancelacion(motivo: string) {
    if (!aCancelar) return;
    setCancelando(true);
    try {
      await cancelarTurno(aCancelar.id, motivo);
      setMensaje({ tono: "ok", texto: "Turno cancelado." });
    } catch (err) {
      setMensaje({ tono: "bad", texto: mensajeDeError(err) });
    } finally {
      setACancelar(null);
      setCancelando(false);
      setRecarga((r) => r + 1);
    }
  }

  return (
    <>
      <PageHeader eyebrow="Socio" titulo="Mis turnos" subtitulo={fechaLarga(ahora.toISOString())} />
      <div className="flex flex-col gap-4">
        {mensaje && <Aviso tono={mensaje.tono}>{mensaje.texto}</Aviso>}
        {errorCarga && <Aviso tono="bad">{errorCarga}</Aviso>}
        {turnos === null && !errorCarga && <p className="text-sm text-ink-3">Cargando turnos…</p>}
        {turnos && (
          <TurnosLista
            turnos={turnos}
            profesionales={profesionales}
            ahora={ahora}
            onCancelar={setACancelar}
          />
        )}

        {aCancelar && (
          <Modal titulo="Cancelar turno" onClose={() => setACancelar(null)}>
            <CancelarTurnoDialog
              turno={aCancelar}
              profesionales={profesionales}
              ahora={ahora}
              cargando={cancelando}
              onConfirmar={confirmarCancelacion}
              onVolver={() => setACancelar(null)}
            />
          </Modal>
        )}
      </div>
    </>
  );
}
