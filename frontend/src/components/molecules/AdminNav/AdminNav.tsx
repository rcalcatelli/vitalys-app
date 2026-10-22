import { NavLink } from "react-router-dom";
import { useConteoFallidas } from "../../../hooks/useConteoFallidas";

const ITEMS = [
  { to: "/admin/hoy", etiqueta: "Hoy", conBadge: true },
  { to: "/admin/personas", etiqueta: "Personas", conBadge: false },
  { to: "/admin/profesionales", etiqueta: "Profesionales", conBadge: false },
  { to: "/admin/pagos", etiqueta: "Pagos", conBadge: false },
];

interface Props {
  /**
   * Cantidad de notificaciones fallidas ya conocida por la pantalla (`null` mientras carga).
   * Si se omite, el menú la consulta por su cuenta; así Hoy no repite el request.
   */
  fallidas?: number | null;
}

/**
 * Molécula: navegación del ADMIN entre sus pantallas (Hoy, Personas, Profesionales).
 * "Hoy" lleva un badge con las notificaciones fallidas, oculto si no hay ninguna.
 */
export function AdminNav({ fallidas }: Props) {
  const propio = useConteoFallidas(fallidas !== undefined);
  const conteo = fallidas === undefined ? propio : (fallidas ?? 0);

  return (
    <nav aria-label="Administración" className="flex gap-1.5 overflow-x-auto">
      {ITEMS.map(({ to, etiqueta, conBadge }) => (
        <NavLink
          key={to}
          to={to}
          aria-label={
            conBadge && conteo > 0
              ? `${etiqueta}, ${conteo} ${conteo === 1 ? "notificación fallida" : "notificaciones fallidas"}`
              : undefined
          }
          className={({ isActive }) =>
            [
              "inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-sm font-medium whitespace-nowrap",
              isActive
                ? "border-clin bg-clin-soft text-clin-ink"
                : "border-border bg-surface text-ink-2",
            ].join(" ")
          }
        >
          {etiqueta}
          {conBadge && conteo > 0 && (
            <span
              title="Notificaciones fallidas"
              className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-bad px-1.5 font-mono text-xs font-semibold text-white"
            >
              {conteo}
            </span>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
