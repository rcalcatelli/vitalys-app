import { useCallback, useEffect, useRef, useState } from "react";
import { mensajeDeError } from "../utils/errores";

export interface Carga<T> {
  /** `null` mientras carga o si falló. */
  datos: T | null;
  /** Mensaje listo para mostrar si la última consulta falló. */
  error: string | null;
  /** Vuelve a consultar (botón "Reintentar" o tras una acción que cambió los datos). */
  recargar: () => void;
}

/**
 * Consulta una vez al montar (y de nuevo con `recargar`) y expone datos o error. Cada pantalla que
 * junta varias consultas independientes usa un `useCarga` por consulta: si una falla, el resto
 * sigue funcionando y solo esa sección muestra el error con su "Reintentar". Con `clave` vuelve a
 * consultar cuando esta cambia (p. ej. el día de hoy al pasar la medianoche).
 */
export function useCarga<T>(consulta: () => Promise<T>, clave: string = ""): Carga<T> {
  const [estado, setEstado] = useState<{ datos: T | null; error: string | null }>({
    datos: null,
    error: null,
  });
  const [version, setVersion] = useState(0);
  const ultima = useRef(consulta);
  useEffect(() => {
    ultima.current = consulta;
  });

  useEffect(() => {
    let vigente = true;
    ultima
      .current()
      .then((datos) => {
        if (vigente) setEstado({ datos, error: null });
      })
      .catch((err: unknown) => {
        if (vigente) setEstado({ datos: null, error: mensajeDeError(err) });
      });
    return () => {
      vigente = false;
    };
  }, [version, clave]);

  const recargar = useCallback(() => setVersion((v) => v + 1), []);
  return { datos: estado.datos, error: estado.error, recargar };
}
