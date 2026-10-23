import { createContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

export type Theme = "light" | "dark";

export interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

export const THEME_KEY = "vitalys_theme";

export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function readStoredTheme(): Theme | null {
  const stored = localStorage.getItem(THEME_KEY);
  return stored === "light" || stored === "dark" ? stored : null;
}

function prefersDark(): boolean {
  return (
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

function resolveInitialTheme(): Theme {
  return readStoredTheme() ?? (prefersDark() ? "dark" : "light");
}

/**
 * Tema claro/oscuro de TODA la app (mecanismo de los tokens de `index.css` vía `[data-theme]`).
 * Vive en la raíz, no en cada pantalla: así el toggle del shell y el del login comparten estado y
 * la elección persiste al recargar en cualquier ruta (antes solo el login lo aplicaba, y el modo
 * oscuro era inalcanzable después de ingresar).
 *
 * Resolución inicial: `localStorage` (`vitalys_theme`) si el usuario ya eligió; si no,
 * `prefers-color-scheme`; si tampoco, `light` (default del mockup). El script inline de
 * `index.html` aplica el mismo criterio antes del primer render para evitar el destello.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(resolveInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      toggleTheme: () => setTheme((prev) => (prev === "light" ? "dark" : "light")),
    }),
    [theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
