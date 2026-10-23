import { useEffect, useState } from "react";
import { listarProfesionales } from "../api/profesionalesApi";
import { misTurnos } from "../api/turnosApi";
import { Aviso, type TonoAviso } from "../components/molecules/Aviso";
import { CancelarTurnoModal } from "../components/organisms/CancelarTurnoModal";
import { TurnosLista } from "../components/organisms/TurnosLista";
import { PageHeader } from "../components/molecules/PageHeader";
import { useAuth } from "../context/AuthContext";
import { useAhora } from "../hooks/useAhora";
import type { Profesional } from "../types/profesional";
import type { Turno } from "../types/turno";
import { mensajeDeError } from "../utils/errores";

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
  const { usuario } = useAuth();
  const nombre = [usuario?.nombre, usuario?.apellido].filter(Boolean).join(" ");

  const [turnos, setTurnos] = useState<Turno[] | null>(null);
  const [profesionales, setProfesionales] = useState<Profesional[]>([]);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [aCancelar, setACancelar] = useState<Turno | null>(null);
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

  return (
    <>
      <PageHeader eyebrow={nombre || "Socio"} titulo="Mis turnos" />
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
          <CancelarTurnoModal
            turno={aCancelar}
            profesionales={profesionales}
            ahora={ahora}
            onCerrar={() => setACancelar(null)}
            onResultado={(r) => {
              setMensaje({ tono: r.ok ? "ok" : "bad", texto: r.texto });
              setRecarga((n) => n + 1);
            }}
          />
        )}
      </div>
    </>
  );
}
