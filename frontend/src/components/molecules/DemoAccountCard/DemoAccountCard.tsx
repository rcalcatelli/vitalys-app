export interface DemoAccountCardProps {
  /** Iniciales para el avatar (2 letras, p.ej. "MP"). */
  initials: string;
  name: string;
  description: string;
  /** Par de colores del avatar (los mismos tonos del diseño: clin, gym o bad). */
  tono?: "clin" | "gym" | "bad";
  onClick: () => void;
}

const TONOS = {
  clin: "bg-clin-soft text-clin-ink",
  gym: "bg-gym-soft text-gym-ink",
  bad: "bg-bad-soft text-bad-ink",
} as const;

/**
 * Molécula: tarjeta de cuenta de demostración (W-01). Presentacional puro —
 * no sabe que autocompleta un formulario ni qué credencial carga, solo emite
 * `onClick`. Es `LoginForm` (organismo) quien decide qué pasa al hacer clic:
 * autocompletar sus propios campos internos, nunca iniciar sesión sola.
 *
 * Avatar con el par de tonos que fija el diseño por cuenta (`tono`).
 */
export function DemoAccountCard({
  initials,
  name,
  description,
  tono = "clin",
  onClick,
}: DemoAccountCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[52px] w-full items-center gap-3 rounded-[10px] border border-border bg-surface px-3 py-2 text-left text-ink transition-colors hover:border-clin"
    >
      <span
        className={`flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full text-xs font-semibold ${TONOS[tono]}`}
      >
        {initials}
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="font-medium">{name}</span>
        <span className="text-[12.5px] text-ink-3">{description}</span>
      </span>
    </button>
  );
}
