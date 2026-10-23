import { createContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Toast } from "../components/molecules/Toast";
import { useMediaQuery } from "../hooks/useMediaQuery";

/** Cuánto dura un toast en pantalla (calco del mockup: `setTimeout(..., 3200)`). */
export const DURACION_TOAST_MS = 3200;

export interface ToastContextValue {
  /** Muestra `mensaje`; si ya había uno, lo reemplaza (un solo toast a la vez). */
  mostrar: (mensaje: string) => void;
}

export const ToastContext = createContext<ToastContextValue | undefined>(undefined);

/**
 * Toasts de éxito de toda la app. Un único toast: mostrar otro reinicia el temporizador, igual que
 * `flash()` del mockup. Los errores de reglas NO pasan por acá: siguen junto a la acción que los
 * causó.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [mensaje, setMensaje] = useState<string | null>(null);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mobile = useMediaQuery("(max-width: 759px)");

  const mostrar = useCallback((texto: string) => {
    if (temporizador.current) clearTimeout(temporizador.current);
    setMensaje(texto);
    temporizador.current = setTimeout(() => setMensaje(null), DURACION_TOAST_MS);
  }, []);

  useEffect(
    () => () => {
      if (temporizador.current) clearTimeout(temporizador.current);
    },
    [],
  );

  const value = useMemo<ToastContextValue>(() => ({ mostrar }), [mostrar]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {mensaje && <Toast mensaje={mensaje} mobile={mobile} />}
    </ToastContext.Provider>
  );
}
