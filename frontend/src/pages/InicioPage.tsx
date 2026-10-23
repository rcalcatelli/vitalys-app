import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { miEstadoCuenta } from "../api/pagosApi";
import { listarProfesionales } from "../api/profesionalesApi";
import { estadoGym, misTurnos } from "../api/turnosApi";
import { Button } from "../components/atoms/Button";
import { Aviso, type TonoAviso } from "../components/molecules/Aviso";
import { PageHeader } from "../components/molecules/PageHeader";
import { AtajosInicio } from "../components/organisms/AtajosInicio";
import { CancelarTurnoModal } from "../components/organisms/CancelarTurnoModal";
import { CuotaCard } from "../components/organisms/CuotaCard";
import { ProximoTurnoCard } from "../components/organisms/ProximoTurnoCard";
import { SemanaSocio } from "../components/organisms/SemanaSocio";
import { useAuth } from "../context/AuthContext";
import { useAhora } from "../hooks/useAhora";
import { useCarga } from "../hooks/useCarga";
import type { Turno } from "../types/turno";
import { fechaLarga } from "../utils/formato";

interface MensajeUi {
  tono: TonoAviso;
  texto: string;
}

/**
 * Inicio del socio (`/socio/inicio`, RF-42): próximo turno, cuota, atajos y "Tu semana". Cada
 * consulta es independiente: si una falla, esa sección muestra su error con "Reintentar" y el resto
 * sigue funcionando. Los nombres de profesionales y el estado de gimnasio son opcionales (si no
 * llegan, hay etiqueta de respaldo y el atajo queda activo; el backend valida la reserva igual).
 */
export function InicioPage() {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const ahora = useAhora();
  const nombre = usuario?.nombre?.split(/\s+/)[0] ?? "";

  const turnos = useCarga(misTurnos);
  const cuenta = useCarga(miEstadoCuenta);
  const gym = useCarga(estadoGym);
  const profesionales = useCarga(listarProfesionales);
  const [aCancelar, setACancelar] = useState<Turno | null>(null);
  const [mensaje, setMensaje] = useState<MensajeUi | null>(null);

  const lista = turnos.datos;
  const proximo =
    lista
      ?.filter((t) => t.estado === "RESERVADO" && new Date(t.inicio).getTime() > ahora.getTime())
      .sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime())[0] ?? null;

  return (
    <>
      <PageHeader
        eyebrow={fechaLarga(ahora.toISOString())}
        titulo={nombre ? `Hola, ${nombre}` : "Inicio"}
      />
      <div className="flex flex-col gap-4">
        {mensaje && <Aviso tono={mensaje.tono}>{mensaje.texto}</Aviso>}
        <div className="flex flex-wrap gap-4">
          {turnos.error && (
            <div className="flex flex-[2_1_400px] flex-col items-start justify-center gap-3 rounded-xl border border-bad bg-bad-soft p-5 text-bad-ink">
              <strong className="font-semibold">No pudimos cargar tus turnos</strong>
              <span className="text-[13.5px]">{turnos.error}</span>
              <Button type="button" variant="outline" onClick={turnos.recargar}>
                Reintentar
              </Button>
            </div>
          )}
          {!turnos.error && lista === null && (
            <div className="flex flex-[2_1_400px] items-center rounded-xl border border-border bg-surface p-5 text-ink-3">
              Cargando tus turnos…
            </div>
          )}
          {lista && (
            <ProximoTurnoCard
              turno={proximo}
              profesionales={profesionales.datos ?? []}
              ahora={ahora}
              onVerTurnos={() => navigate("/socio/turnos")}
              onCancelar={setACancelar}
            />
          )}
          <CuotaCard
            estado={cuenta.datos}
            error={cuenta.error}
            onReintentar={cuenta.recargar}
            onVerEstado={() => navigate("/socio/estado-cuenta")}
          />
        </div>

        <AtajosInicio
          estadoGym={gym.datos}
          onGimnasio={() => navigate("/socio/reservar-gimnasio")}
          onConsultorio={() => navigate("/socio/reservar-consultorio")}
        />

        {lista && <SemanaSocio turnos={lista} ahora={ahora} />}
      </div>

      {aCancelar && (
        <CancelarTurnoModal
          turno={aCancelar}
          profesionales={profesionales.datos ?? []}
          ahora={ahora}
          onCerrar={() => setACancelar(null)}
          onResultado={(r) => {
            setMensaje({ tono: r.ok ? "ok" : "bad", texto: r.texto });
            turnos.recargar();
          }}
        />
      )}
    </>
  );
}
