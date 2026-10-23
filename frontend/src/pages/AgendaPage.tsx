import { useState } from "react";
import { listarFranjas, miPerfilProfesional } from "../api/profesionalesApi";
import { marcarAusente, marcarCompletado, miAgenda } from "../api/turnosApi";
import { Aviso, type TonoAviso } from "../components/molecules/Aviso";
import { AgendaDia } from "../components/organisms/AgendaDia";
import { PageHeader } from "../components/molecules/PageHeader";
import { useAhora } from "../hooks/useAhora";
import { useCarga } from "../hooks/useCarga";
import { huecosLibres } from "../utils/agendaUi";
import { mensajeDeError } from "../utils/errores";
import { fechaBA, hoyBA, sumarDias } from "../utils/fechaBA";
import { etiquetaEspecialidad, fechaLarga } from "../utils/formato";

const DIAS_ADELANTE = 7;

interface MensajeUi {
  tono: TonoAviso;
  texto: string;
}

/**
 * Agenda del profesional (W-03, home del rol): resumen de hoy, sus turnos con paciente y DNI, los
 * huecos libres (disponibilidad menos turnos), el turno en curso resaltado y los próximos 7 días.
 * Atendido / Ausente los habilita la ventana horaria (la valida también el servidor: un 422 muestra
 * su mensaje y recarga la agenda). No hay "Deshacer". La disponibilidad y el perfil son opcionales:
 * si no se pueden leer, la agenda sigue mostrando los turnos sin huecos ni minutos por consulta.
 */
export function AgendaPage() {
  const ahora = useAhora();
  const hoy = hoyBA(ahora);

  const agenda = useCarga(() => miAgenda(hoy, sumarDias(hoy, DIAS_ADELANTE)), hoy);
  const disponibilidad = useCarga(async () => {
    const perfil = await miPerfilProfesional();
    return { perfil, franjas: await listarFranjas(perfil.id) };
  });
  const [mensaje, setMensaje] = useState<MensajeUi | null>(null);
  const [ocupadoId, setOcupadoId] = useState<number | null>(null);

  async function marcar(id: number, accion: (id: number) => Promise<unknown>) {
    setOcupadoId(id);
    setMensaje(null);
    try {
      await accion(id);
    } catch (err) {
      setMensaje({ tono: "bad", texto: mensajeDeError(err) });
    } finally {
      setOcupadoId(null);
      agenda.recargar();
    }
  }

  const perfil = disponibilidad.datos?.perfil ?? null;
  const deHoy = (agenda.datos ?? []).filter((t) => fechaBA(t.inicio) === hoy);
  const huecos = disponibilidad.datos
    ? huecosLibres(
        disponibilidad.datos.franjas,
        disponibilidad.datos.perfil.duracionTurnoMinutos,
        hoy,
        deHoy,
      )
    : [];
  const fecha = fechaLarga(ahora.toISOString());

  return (
    <>
      <PageHeader
        eyebrow={perfil ? `${fecha} · ${etiquetaEspecialidad(perfil.especialidad)}` : fecha}
        titulo="Agenda de hoy"
      />
      <div className="flex flex-col gap-4">
        {mensaje && <Aviso tono={mensaje.tono}>{mensaje.texto}</Aviso>}
        {agenda.error && <Aviso tono="bad">{agenda.error}</Aviso>}
        {agenda.datos === null && !agenda.error && (
          <p className="text-sm text-ink-3">Cargando agenda…</p>
        )}
        {agenda.datos && (
          <AgendaDia
            turnos={agenda.datos}
            ahora={ahora}
            hoy={hoy}
            huecos={huecos}
            duracionTurnoMinutos={perfil?.duracionTurnoMinutos ?? null}
            ocupadoId={ocupadoId}
            onAtendido={(t) => marcar(t.id, marcarCompletado)}
            onAusente={(t) => marcar(t.id, marcarAusente)}
          />
        )}
      </div>
    </>
  );
}
