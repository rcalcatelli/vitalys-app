import { useEffect, useState } from "react";
import { listarFallidas } from "../api/notificacionesApi";
import { obtenerResumenHoy } from "../api/resumenApi";
import { Button } from "../components/atoms/Button";
import { FieldError } from "../components/atoms/FieldError";
import { AdminNav } from "../components/molecules/AdminNav";
import { NotificacionesFallidas } from "../components/organisms/NotificacionesFallidas";
import { PanelHoy } from "../components/organisms/PanelHoy";
import { useAuth } from "../context/AuthContext";
import type { NotificacionFallida } from "../types/notificacion";
import type { ResumenHoy } from "../types/resumen";
import { fechaLarga } from "../utils/formato";

/**
 * "Hoy en el centro" (ADMIN): pantalla de inicio del administrador. Arriba el resumen del día
 * (indicadores, ocupación del gimnasio y socios con impagos) y abajo las notificaciones que no
 * llegaron. Contenedor: consulta las dos fuentes por separado, así una falla no tapa a la otra, y
 * le pasa el conteo de fallidas al menú para no repetir el request.
 */
export function HoyPage() {
  const { usuario, logout } = useAuth();
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
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6 sm:px-6 sm:py-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold tracking-wider text-ink-3 uppercase">
            Administración
          </span>
          <h1 className="font-heading text-2xl font-semibold text-ink sm:text-3xl">
            Hoy en el centro
          </h1>
          <p className="text-sm text-ink-2">{fechaLarga(new Date().toISOString())}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-ink-3 sm:inline">{usuario?.email}</span>
          <Button type="button" variant="outline" onClick={logout}>
            Cerrar sesión
          </Button>
        </div>
      </header>

      <AdminNav fallidas={fallidas ? fallidas.length : null} />

      {errorResumen && <FieldError>{errorResumen}</FieldError>}
      {resumen === null && !errorResumen && (
        <p className="text-sm text-ink-3">Cargando el resumen…</p>
      )}
      {resumen && <PanelHoy resumen={resumen} ahora={new Date()} />}

      {error && <FieldError>{error}</FieldError>}
      {fallidas === null && !error && <p className="text-sm text-ink-3">Cargando…</p>}
      {fallidas && <NotificacionesFallidas notificaciones={fallidas} />}
    </main>
  );
}
