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
 * Medidas del diseño: las dos mitades reparten el ancho (`flex: 1 1 420px`) y la columna del
 * formulario se acota a 400px, con 20px de margen lateral en mobile.
 */
export function AuthSplitLayout({ theme, onToggleTheme, children }: AuthSplitLayoutProps) {
  return (
    <div className="flex min-h-screen w-full flex-wrap">
      <BrandPanel />
      <div className="flex w-full flex-1 basis-[420px] items-start justify-center px-5 pt-7 pb-10">
        <div className="flex w-full max-w-[400px] flex-col gap-5">
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
