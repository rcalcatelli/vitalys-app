import { NavLink } from "react-router-dom";

const ITEMS = [
  { to: "/admin/personas", etiqueta: "Personas" },
  { to: "/admin/profesionales", etiqueta: "Profesionales" },
];

/**
 * Molécula: navegación del ADMIN entre sus pantallas (Personas, Profesionales).
 * Hasta ahora no había menú; se agrega con estas dos entradas y crece con cada módulo.
 */
export function AdminNav() {
  return (
    <nav aria-label="Administración" className="flex gap-1.5 overflow-x-auto">
      {ITEMS.map(({ to, etiqueta }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            [
              "inline-flex h-9 items-center rounded-full border px-3.5 text-sm font-medium whitespace-nowrap",
              isActive
                ? "border-clin bg-clin-soft text-clin-ink"
                : "border-border bg-surface text-ink-2",
            ].join(" ")
          }
        >
          {etiqueta}
        </NavLink>
      ))}
    </nav>
  );
}
