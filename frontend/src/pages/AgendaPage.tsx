import { useEffect, useState } from "react";
import { marcarAusente, marcarCompletado, miAgenda } from "../api/turnosApi";
import { Aviso, type TonoAviso } from "../components/molecules/Aviso";
import { ProfesionalNav } from "../components/molecules/ProfesionalNav";
import { AgendaDia } from "../components/organisms/AgendaDia";
import { PantallaLayout } from "../components/templates/PantallaLayout";
import { useAuth } from "../context/AuthContext";
import { useAhora } from "../hooks/useAhora";
import type { TurnoAgenda } from "../types/turno";
import { mensajeDeError } from "../utils/errores";
import { hoyBA, sumarDias } from "../utils/fechaBA";
import { fechaLarga } from "../utils/formato";

const DIAS_ADELANTE = 7;

interface MensajeUi {
  tono: TonoAviso;
  texto: string;
}

/**
 * Agenda del profesional (W-03, home del rol): sus turnos de hoy a +7 días con paciente y DNI.
 * Atendido / Ausente los habilita la ventana horaria (la valida también el servidor: un 422 muestra
 * su mensaje y recarga la agenda). No hay "Deshacer".
 */
export function AgendaPage() {
  const { usuario, logout } = useAuth();
  const ahora = useAhora();
  const hoy = hoyBA(ahora);

  const [agenda, setAgenda] = useState<TurnoAgenda[] | null>(null);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<MensajeUi | null>(null);
  const [ocupadoId, setOcupadoId] = useState<number | null>(null);
  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    let vigente = true;
    miAgenda(hoy, sumarDias(hoy, DIAS_ADELANTE))
      .then((lista) => {
        if (!vigente) return;
        setAgenda(lista);
        setErrorCarga(null);
      })
      .catch((err: unknown) => {
        if (vigente) setErrorCarga(mensajeDeError(err));
      });
    return () => {
      vigente = false;
    };
  }, [hoy, recarga]);

  async function marcar(turno: TurnoAgenda, accion: (id: number) => Promise<unknown>) {
    setOcupadoId(turno.id);
    setMensaje(null);
    try {
      await accion(turno.id);
    } catch (err) {
      setMensaje({ tono: "bad", texto: mensajeDeError(err) });
    } finally {
      setOcupadoId(null);
      setRecarga((r) => r + 1);
    }
  }

  return (
    <PantallaLayout
      eyebrow="Profesional"
      titulo="Agenda"
      subtitulo={fechaLarga(ahora.toISOString())}
      email={usuario?.email}
      onLogout={logout}
      nav={<ProfesionalNav />}
    >
      {mensaje && <Aviso tono={mensaje.tono}>{mensaje.texto}</Aviso>}
      {errorCarga && <Aviso tono="bad">{errorCarga}</Aviso>}
      {agenda === null && !errorCarga && <p className="text-sm text-ink-3">Cargando agenda…</p>}
      {agenda && (
        <AgendaDia
          turnos={agenda}
          ahora={ahora}
          hoy={hoy}
          ocupadoId={ocupadoId}
          onAtendido={(t) => marcar(t, marcarCompletado)}
          onAusente={(t) => marcar(t, marcarAusente)}
        />
      )}
    </PantallaLayout>
  );
}
