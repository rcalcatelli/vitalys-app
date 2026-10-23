import { NavLink } from "react-router-dom";
import type { NavTono } from "../../../router/navConfig";

/** Ítem de navegación ya resuelto por el container (badge calculado, texto de accesibilidad). */
export interface NavItemVista {
  to: string;
  etiqueta: string;
  corta: string;
  tono: NavTono;
  badge?: number;
  ariaLabel?: string;
}

const esGym = (tono: NavTono) => tono === "gym";

/** Sidebar de desktop: puntito de color, ítem activo con fondo suave del tono. */
export function SidebarNav({ items }: { items: NavItemVista[] }) {
  return (
    <nav aria-label="Principal" className="flex flex-col gap-0.5">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          aria-label={item.ariaLabel}
          className={({ isActive }) =>
            [
              "flex h-10 w-full items-center gap-2.5 rounded-md px-3 text-[14px] no-underline hover:bg-surface-2",
              isActive
                ? `font-semibold ${esGym(item.tono) ? "bg-gym-soft text-gym-ink" : "bg-clin-soft text-clin-ink"}`
                : "font-medium text-ink-2",
            ].join(" ")
          }
        >
          <span
            aria-hidden="true"
            className={[
              "h-2 w-2 shrink-0 rounded-xs",
              item.tono === "gym" ? "bg-gym" : item.tono === "clin" ? "bg-clin" : "bg-ink-3",
            ].join(" ")}
          />
          {item.etiqueta}
          {item.badge ? (
            <span
              title="Notificaciones fallidas"
              className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-bad px-1.5 font-mono text-[11px] font-semibold text-surface"
            >
              {item.badge}
            </span>
          ) : null}
        </NavLink>
      ))}
    </nav>
  );
}

/** Tab bar fija de mobile: barrita de 4px sobre el ítem activo. */
export function TabBar({ items }: { items: NavItemVista[] }) {
  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-surface px-1 pt-1 pb-[calc(4px+env(safe-area-inset-bottom))]"
    >
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          aria-label={item.ariaLabel}
          className={({ isActive }) =>
            [
              "relative flex h-14 min-w-0 flex-1 flex-col items-center justify-center gap-[5px] text-[11px] no-underline",
              isActive
                ? `font-semibold ${esGym(item.tono) ? "text-gym-ink" : "text-clin-ink"}`
                : "font-medium text-ink-3",
            ].join(" ")
          }
        >
          {({ isActive }) => (
            <>
              <span
                aria-hidden="true"
                className={[
                  "h-1 w-[22px] rounded-xs",
                  isActive ? (esGym(item.tono) ? "bg-gym" : "bg-clin") : "bg-transparent",
                ].join(" ")}
              />
              {item.corta}
              {item.badge ? (
                <span
                  title="Notificaciones fallidas"
                  className="absolute top-1 left-[calc(50%+10px)] flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-bad px-[5px] font-mono text-[10.5px] font-semibold text-surface"
                >
                  {item.badge}
                </span>
              ) : null}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
