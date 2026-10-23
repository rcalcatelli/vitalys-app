import { createContext } from "react";
import type { Fallidas } from "../../../hooks/useFallidas";

export interface ShellContextValue {
  /** Chip de fecha y hora del encabezado (`Mar 29 sep · 10:40`); `null` en mobile. */
  chipAhora: string | null;
  /**
   * Notificaciones fallidas que el shell ya consultó para el badge del ADMIN. "Hoy en el centro"
   * las lee de acá para no pedirlas dos veces; `null` si el usuario no es ADMIN.
   */
  fallidas: Fallidas | null;
}

/**
 * Datos que el shell le da a las cabeceras de pantalla (`PageHeader`) sin que cada page los
 * repita. Fuera del shell (tests, login) vale `null` y la cabecera se ve sin chip.
 */
export const ShellContext = createContext<ShellContextValue | null>(null);
