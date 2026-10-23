import { useContext } from "react";
import { ThemeContext } from "../context/ThemeContext";
import type { Theme, ThemeContextValue } from "../context/ThemeContext";

export type { Theme };

/**
 * Tema claro/oscuro actual y su toggle. El estado vive en `ThemeProvider` (raíz de la app); este
 * hook solo lo lee. Lo consumen las pages/containers (`LoginPage`, `ShellLayout`) y le pasan
 * `theme`/`toggleTheme` a los componentes presentacionales por props.
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme debe usarse dentro de un <ThemeProvider>");
  }
  return context;
}
