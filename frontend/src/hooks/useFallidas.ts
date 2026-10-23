import { useEffect, useState } from "react";
import { listarFallidas } from "../api/notificacionesApi";
import type { NotificacionFallida } from "../types/notificacion";

export interface Fallidas {
  /** `null` mientras carga (o si se omitió la consulta). */
  lista: NotificacionFallida[] | null;
  /** La consulta falló: la lista queda en `null` y el badge simplemente no se muestra. */
  error: boolean;
}

/**
 * Notificaciones fallidas del ADMIN, consultadas UNA sola vez: el shell las pide para el badge del
 * menú y "Hoy en el centro" las lee de ahí (`ShellContext`) en vez de volver a pedirlas. Con
 * `omitir` (no es ADMIN, o ya hay una consulta compartida) no consulta.
 */
export function useFallidas(omitir: boolean): Fallidas {
  const [estado, setEstado] = useState<Fallidas>({ lista: null, error: false });

  useEffect(() => {
    if (omitir) return;
    let vigente = true;
    listarFallidas()
      .then((lista) => {
        if (vigente) setEstado({ lista, error: false });
      })
      .catch(() => {
        if (vigente) setEstado({ lista: null, error: true });
      });
    return () => {
      vigente = false;
    };
  }, [omitir]);

  return estado;
}
