import { Button } from "../../atoms/Button";
import type { Theme } from "../../../hooks/useTheme";

export interface ThemeToggleProps {
  theme: Theme;
  onToggle: () => void;
}

/**
 * Molécula: botón que ofrece pasar al tema contrario del actual (calco del
 * mockup: `{{ themeLabel }}`, `height:36px;border:1px solid var(--border)`).
 * Presentacional puro — no lee `localStorage` ni toca `<html>`, eso vive en
 * `hooks/useTheme` y lo maneja la page (`LoginPage`). El texto visible ES el
 * nombre accesible del botón, no hace falta un `aria-label` aparte.
 */
export function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  const label = theme === "light" ? "Modo oscuro" : "Modo claro";

  return (
    <Button type="button" variant="outline" onClick={onToggle}>
      {label}
    </Button>
  );
}
