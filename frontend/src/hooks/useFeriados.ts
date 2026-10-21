import { useEffect, useRef, useState } from "react";
import { listarFeriados } from "../api/feriadosApi";
import type { Feriado } from "../types/turno";

interface Resultado {
  feriados: Feriado[];
  /** `true` si el año pedido todavía no llegó. */
  cargando: boolean;
  /** `true` si no se pudo leer: la pantalla sigue y el backend valida igual al reservar. */
  error: boolean;
  /** El feriado de esa fecha (`YYYY-MM-DD`) o `undefined`. */
  feriadoDe: (fecha: string) => Feriado | undefined;
}

/**
 * Feriados del año pedido, con caché por año (una sola request aunque el usuario navegue de día).
 * Con `null` no consulta nada (para no pedir dos veces el mismo año). Guarda la promesa, no el resultado, para que dos renders del mismo año compartan el request.
 */
export function useFeriados(anio: number | null): Resultado {
  const cache = useRef(new Map<number, Promise<Feriado[]>>());
  const [estado, setEstado] = useState<{
    anio: number;
    feriados: Feriado[];
    error: boolean;
  } | null>(null);

  useEffect(() => {
    if (anio === null) return;
    let vigente = true;
    let promesa = cache.current.get(anio);
    if (!promesa) {
      promesa = listarFeriados(anio);
      cache.current.set(anio, promesa);
    }
    promesa
      .then((feriados) => {
        if (vigente) setEstado({ anio, feriados, error: false });
      })
      .catch(() => {
        cache.current.delete(anio);
        if (vigente) setEstado({ anio, feriados: [], error: true });
      });
    return () => {
      vigente = false;
    };
  }, [anio]);

  if (anio === null)
    return { feriados: [], cargando: false, error: false, feriadoDe: () => undefined };
  const listo = estado?.anio === anio;
  const feriados = listo ? estado.feriados : [];
  return {
    feriados,
    cargando: !listo,
    error: listo && estado.error,
    feriadoDe: (fecha) => feriados.find((f) => f.fecha === fecha),
  };
}
