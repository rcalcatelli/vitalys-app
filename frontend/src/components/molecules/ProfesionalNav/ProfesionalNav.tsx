import { NavLink } from "react-router-dom";

const ITEMS = [
  { to: "/profesional/agenda", etiqueta: "Agenda" },
  { to: "/profesional/disponibilidad", etiqueta: "Disponibilidad" },
];

/** Molécula: navegación del profesional entre su agenda y su disponibilidad. */
export function ProfesionalNav() {
  return (
    <nav aria-label="Profesional" className="flex gap-1.5 overflow-x-auto">
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
