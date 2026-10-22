import { useEffect, useState } from "react";

/**
 * Reloj de la pantalla: devuelve la hora actual y la refresca cada `intervaloMs` (30 s por defecto).
 * La página lo pasa como prop `ahora` a los componentes presentacionales, que no leen el reloj.
 */
export function useAhora(intervaloMs = 30_000): Date {
  const [ahora, setAhora] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setAhora(new Date()), intervaloMs);
    return () => clearInterval(id);
  }, [intervaloMs]);

  return ahora;
}
