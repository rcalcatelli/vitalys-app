import type { ReactNode } from "react";
import type { Theme } from "../../../hooks/useTheme";
import { SidebarNav, TabBar } from "./NavItems";
import type { NavItemVista } from "./NavItems";

export type { NavItemVista };

export interface UsuarioVista {
  /** Línea principal de la tarjeta: "Nombre Apellido" o, sin nombre, el email. */
  nombre: string;
  /** Línea secundaria: el rol ("Recepción", "Socio/a", "Profesional"). */
  detalle: string;
  iniciales: string;
}

export interface AppShellProps {
  /** Debajo del logo en la sidebar ("Recepción", "Socio / paciente"…). */
  rolLabel: string;
  items: NavItemVista[];
  usuario: UsuarioVista;
  theme: Theme;
  onToggleTheme: () => void;
  onLogout: () => void;
  /** `true` < 760px: header de 56px + tab bar en vez de sidebar. */
  mobile: boolean;
  /** Franja bajo el header (p.ej. "Recepción operando en nombre de…"). */
  banner?: ReactNode;
  children: ReactNode;
}

function Marca({ tamano }: { tamano: 24 | 26 }) {
  const punto = tamano === 26 ? 10 : 9;
  return (
    <div
      aria-hidden="true"
      style={{ width: tamano, height: tamano }}
      className="relative shrink-0 rounded-[7px] bg-clin"
    >
      <span
        style={{ width: punto, height: punto }}
        className="absolute -right-[3px] -bottom-[3px] rounded-[3px] border-2 border-surface bg-gym"
      />
    </div>
  );
}

/**
 * Template del shell logueado (Vitalys.dc.html). Desktop (>= 760px): sidebar de 248px pegada
 * arriba con logo + rol, navegación por rol, botón de tema, tarjeta de usuario y "Cerrar sesión".
 * Mobile: header de 56px (logo, tema, avatar que cierra sesión) y tab bar fija abajo. Presentacional:
 * el layout lo elige el container con `mobile` y un único árbol DOM, así los links no se duplican.
 */
export function AppShell({
  rolLabel,
  items,
  usuario,
  theme,
  onToggleTheme,
  onLogout,
  mobile,
  banner,
  children,
}: AppShellProps) {
  return (
    <div className="flex min-h-screen">
      {!mobile && (
        <aside className="sticky top-0 flex h-screen w-[248px] shrink-0 flex-col gap-5 border-r border-border bg-surface px-3.5 py-[22px]">
          <div className="flex items-center gap-2.5 px-2">
            <Marca tamano={26} />
            <div className="flex flex-col leading-[1.1]">
              <span className="font-heading text-[18px] font-bold">Vitalys</span>
              <span className="text-micro text-ink-3">{rolLabel}</span>
            </div>
          </div>

          <SidebarNav items={items} />

          <div className="mt-auto flex flex-col gap-2.5">
            <button
              type="button"
              onClick={onToggleTheme}
              className="h-9 rounded-md border border-border bg-transparent px-3 text-left text-small text-ink-2"
            >
              {theme === "dark" ? "Modo claro" : "Modo oscuro"}
            </button>
            <div className="flex items-center gap-2.5 border-t border-border px-2 py-2.5">
              <span
                aria-hidden="true"
                className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-clin-soft text-xs font-semibold text-clin-ink"
              >
                {usuario.iniciales}
              </span>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[13.5px] font-medium">{usuario.nombre}</span>
                <span className="text-xs text-ink-3">{usuario.detalle}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="h-[34px] bg-transparent px-2 text-left text-small text-ink-3 hover:text-ink"
            >
              Cerrar sesión
            </button>
          </div>
        </aside>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {mobile && (
          <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-border bg-surface px-4">
            <div className="flex items-center gap-2.5">
              <Marca tamano={24} />
              <span className="font-heading text-[17px] font-bold">Vitalys</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onToggleTheme}
                aria-label="Cambiar tema"
                className="h-10 rounded-md border border-border bg-transparent px-2.5 text-caption text-ink-2"
              >
                {theme === "dark" ? "Claro" : "Oscuro"}
              </button>
              <button
                type="button"
                onClick={onLogout}
                aria-label="Cerrar sesión"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-clin-soft text-xs font-semibold text-clin-ink"
              >
                {usuario.iniciales}
              </button>
            </div>
          </header>
        )}

        {banner}

        <main
          className={[
            "mx-auto w-full max-w-[1160px] flex-1",
            mobile ? "px-4 pt-[18px] pb-24" : "px-9 pt-8 pb-14",
          ].join(" ")}
        >
          {children}
        </main>
      </div>

      {mobile && <TabBar items={items} />}
    </div>
  );
}
