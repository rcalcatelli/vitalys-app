import type { ReactNode } from "react";
import { BrandPanel } from "../../organisms/BrandPanel";
import { Logo } from "../../atoms/Logo";
import { ThemeToggle } from "../../molecules/ThemeToggle";
import type { Theme } from "../../../hooks/useTheme";

export interface AuthSplitLayoutProps {
  theme: Theme;
  onToggleTheme: () => void;
  children: ReactNode;
}

/**
 * Template del login (W-01): panel de marca (`BrandPanel`, oculto en mobile) +
 * panel de formulario, con su propia fila de logo + toggle de tema arriba.
 * `children` es el contenido que sí varía (hoy solo `LoginForm`; si el día de
 * mañana `RegistroPage` migra a este mismo layout partido, comparte esta
 * misma fila de header). No conoce `AuthContext` ni `react-router` — recibe
 * `theme`/`onToggleTheme` ya resueltos por la page (`useTheme`), igual que
 * `AuthLayout` recibe su `footer` ya resuelto.
 *
 * Mobile first: la columna del formulario arranca en `w-full` (sin
 * `max-w-*`) y recién desde `sm:` se acota a `sm:max-w-md` — mismo criterio
 * que `AuthLayout`.
 */
export function AuthSplitLayout({ theme, onToggleTheme, children }: AuthSplitLayoutProps) {
  return (
    <div className="flex min-h-screen w-full flex-wrap">
      <BrandPanel />
      <div className="flex w-full flex-1 items-start justify-center px-4 py-7 sm:px-5 md:py-10">
        <div className="flex w-full flex-col gap-5 sm:max-w-md">
          <div className="flex items-center justify-between">
            <Logo />
            <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
