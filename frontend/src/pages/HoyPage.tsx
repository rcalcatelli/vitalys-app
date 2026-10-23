import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { obtenerResumenHoy } from "../api/resumenApi";
import { FieldError } from "../components/atoms/FieldError";
import { PageHeader } from "../components/molecules/PageHeader";
import { NotificacionesFallidas } from "../components/organisms/NotificacionesFallidas";
import { PanelHoy } from "../components/organisms/PanelHoy";
import { ShellContext } from "../components/templates/AppShell/ShellContext";
import { useAhora } from "../hooks/useAhora";
import { useFallidas } from "../hooks/useFallidas";
import type { ResumenHoy } from "../types/resumen";
import { horaBA } from "../utils/fechaBA";
import { fechaLarga } from "../utils/formato";

/**
 * "Hoy en el centro" (ADMIN): pantalla de inicio del administrador. Arriba el resumen del día
 * (indicadores, ocupación del gimnasio y socios con impagos) y abajo las notificaciones que no
 * llegaron. Contenedor: consulta las dos fuentes por separado, así una falla no tapa a la otra.
 * Las notificaciones fallidas ya las pidió el shell para el badge del menú: se leen de ahí y solo
 * se consultan acá si la pantalla se usa fuera del shell.
 */
export function HoyPage() {
  const ahora = useAhora();
  const navigate = useNavigate();
  const compartidas = useContext(ShellContext)?.fallidas ?? null;
  const propias = useFallidas(compartidas !== null);
  const { lista: fallidas, error: errorFallidas } = compartidas ?? propias;
  const [resumen, setResumen] = useState<ResumenHoy | null>(null);
  const [errorResumen, setErrorResumen] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
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
        {resumen && (
          <PanelHoy resumen={resumen} ahora={ahora} onIrAPagos={() => navigate("/admin/pagos")} />
        )}

        {errorFallidas && (
          <FieldError>No se pudieron cargar las notificaciones. Intentá de nuevo.</FieldError>
        )}
        {fallidas === null && !errorFallidas && <p className="text-sm text-ink-3">Cargando…</p>}
        {fallidas && <NotificacionesFallidas notificaciones={fallidas} />}
      </div>
    </>
  );
}
