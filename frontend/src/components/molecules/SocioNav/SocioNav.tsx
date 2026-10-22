import { NavLink } from "react-router-dom";

const ITEMS = [
  { to: "/socio/reservar-gimnasio", etiqueta: "Reservar gimnasio", gym: true },
  { to: "/socio/reservar-consultorio", etiqueta: "Turno de consultorio", gym: false },
  { to: "/socio/turnos", etiqueta: "Mis turnos", gym: false },
];

/** Molécula: navegación del socio (gimnasio en naranja, consultorio y turnos en teal). */
export function SocioNav() {
  return (
    <nav aria-label="Socio" className="flex gap-1.5 overflow-x-auto">
      {ITEMS.map(({ to, etiqueta, gym }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            [
              "inline-flex h-9 items-center rounded-full border px-3.5 text-sm font-medium whitespace-nowrap",
              isActive
                ? gym
                  ? "border-gym bg-gym-soft text-gym-ink"
                  : "border-clin bg-clin-soft text-clin-ink"
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
