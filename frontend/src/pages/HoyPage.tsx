import { useEffect, useState } from "react";
import { listarFallidas } from "../api/notificacionesApi";
import { obtenerResumenHoy } from "../api/resumenApi";
import { FieldError } from "../components/atoms/FieldError";
import { PageHeader } from "../components/molecules/PageHeader";
import { NotificacionesFallidas } from "../components/organisms/NotificacionesFallidas";
import { PanelHoy } from "../components/organisms/PanelHoy";
import { useAhora } from "../hooks/useAhora";
import type { NotificacionFallida } from "../types/notificacion";
import type { ResumenHoy } from "../types/resumen";
import { horaBA } from "../utils/fechaBA";
import { fechaLarga } from "../utils/formato";

/**
 * "Hoy en el centro" (ADMIN): pantalla de inicio del administrador. Arriba el resumen del día
 * (indicadores, ocupación del gimnasio y socios con impagos) y abajo las notificaciones que no
 * llegaron. Contenedor: consulta las dos fuentes por separado, así una falla no tapa a la otra.
 */
export function HoyPage() {
  const ahora = useAhora();
  const [fallidas, setFallidas] = useState<NotificacionFallida[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resumen, setResumen] = useState<ResumenHoy | null>(null);
  const [errorResumen, setErrorResumen] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    listarFallidas()
      .then((lista) => {
        if (vigente) setFallidas(lista);
      })
      .catch(() => {
        if (vigente) setError("No se pudieron cargar las notificaciones. Intentá de nuevo.");
      });
    obtenerResumenHoy()
      .then((r) => {
        if (vigente) setResumen(r);
      })
      .catch(() => {
        if (vigente) setErrorResumen("No se pudo cargar el resumen del día. Intentá de nuevo.");
      });
    return () => {
      vigente = false;
    };
  }, []);

  return (
    <>
      <PageHeader
        eyebrow={`${fechaLarga(ahora.toISOString())} · ${horaBA(ahora)}`}
        titulo="Hoy en el centro"
      />
      <div className="flex flex-col gap-4">
        {errorResumen && <FieldError>{errorResumen}</FieldError>}
        {resumen === null && !errorResumen && (
          <p className="text-sm text-ink-3">Cargando el resumen…</p>
        )}
        {resumen && <PanelHoy resumen={resumen} ahora={ahora} />}

        {error && <FieldError>{error}</FieldError>}
        {fallidas === null && !error && <p className="text-sm text-ink-3">Cargando…</p>}
        {fallidas && <NotificacionesFallidas notificaciones={fallidas} />}
      </div>
    </>
  );
}
