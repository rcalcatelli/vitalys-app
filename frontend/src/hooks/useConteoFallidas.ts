import { useEffect, useState } from "react";
import { listarFallidas } from "../api/notificacionesApi";

/**
 * Cantidad de notificaciones fallidas para el badge del menú del ADMIN. Si `omitir` es true
 * (la pantalla ya tiene la lista y pasa el conteo al menú) no consulta, así no se duplica el request.
 * Un error no rompe la pantalla: el badge simplemente no se muestra.
 */
export function useConteoFallidas(omitir: boolean): number {
  const [conteo, setConteo] = useState(0);

  useEffect(() => {
    if (omitir) return;
    let vigente = true;
    listarFallidas()
      .then((lista) => {
        if (vigente) setConteo(lista.length);
      })
      .catch(() => undefined);
    return () => {
      vigente = false;
    };
  }, [omitir]);

  return conteo;
}
