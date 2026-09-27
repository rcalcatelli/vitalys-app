import { useEffect, useState } from "react";

export type Theme = "light" | "dark";

const THEME_KEY = "vitalys_theme";

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
 * Hook de tema claro/oscuro (mecanismo ya soportado por los tokens de
 * `index.css` vía `[data-theme]`). Vive en `hooks/`, no en `components/`,
 * porque toca `document.documentElement` y `localStorage` — efectos de lado
 * que un átomo/molécula/organismo presentacional no debe conocer (ver
 * `components/README.md`). Lo consume la page (contenedor) y le pasa
 * `theme`/`toggleTheme` a `ThemeToggle` por props.
 *
 * Resolución inicial: `localStorage` (`vitalys_theme`) si el usuario ya
 * eligió antes; si no, `prefers-color-scheme`; si tampoco, `light` (default
 * del mockup, ver `:root,[data-theme="light"]` en `index.css`).
 */
export function useTheme(): { theme: Theme; toggleTheme: () => void } {
  const [theme, setTheme] = useState<Theme>(resolveInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  function toggleTheme(): void {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  }

  return { theme, toggleTheme };
}
