export interface DemoAccountCardProps {
  /** Iniciales para el avatar (2 letras, p.ej. "MP"). */
  initials: string;
  name: string;
  description: string;
  onClick: () => void;
}

/**
 * Molécula: tarjeta de cuenta de demostración (W-01). Presentacional puro —
 * no sabe que autocompleta un formulario ni qué credencial carga, solo emite
 * `onClick`. Es `LoginForm` (organismo) quien decide qué pasa al hacer clic:
 * autocompletar sus propios campos internos, nunca iniciar sesión sola.
 *
 * Avatar en `clin-soft`/`clin-ink`: mismo par de tokens que usa el mockup
 * para el avatar de usuario logueado (sidebar/header), no uno inventado por
 * rol — la lista de demo del mockup no fija colores por ítem
 * (`{{ d.bg }}`/`{{ d.fg }}` quedan como placeholders sin resolver).
 */
export function DemoAccountCard({ initials, name, description, onClick }: DemoAccountCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[52px] w-full items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2 text-left text-ink transition-colors hover:border-clin"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-clin-soft text-xs font-semibold text-clin-ink">
        {initials}
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="font-medium">{name}</span>
        <span className="text-[12.5px] text-ink-3">{description}</span>
      </span>
    </button>
  );
}
