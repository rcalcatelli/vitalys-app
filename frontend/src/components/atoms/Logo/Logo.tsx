export type LogoVariant = "brand" | "surface";
export type LogoSize = "md" | "lg";

export interface LogoProps {
  /**
   * `brand`: para el panel de marca (fondo teal/`--brand`) — ícono blanco fijo
   * y texto blanco fijo, igual que el mockup (`background:#FFFFFF` literal,
   * sin var: ese panel se mantiene con la misma paleta clara/oscura fija sin
   * importar el tema de la app, por eso `Logo` no lo resuelve con un token).
   * `surface`: para el panel del formulario — ícono con `bg-clin` y texto
   * `text-ink` (sí sigue el tema).
   */
  variant?: LogoVariant;
  /** `lg` (28px, panel de marca) vs `md` (24px, panel de formulario). */
  size?: LogoSize;
}

const iconSizeClasses: Record<LogoSize, string> = {
  md: "h-6 w-6",
  lg: "h-7 w-7",
};

const textSizeClasses: Record<LogoSize, string> = {
  md: "text-lg",
  lg: "text-xl",
};

/**
 * Átomo de marca: ícono (cuadrado + acento) + wordmark "Vitalys". Presentacional
 * puro, sin props de negocio — solo variantes visuales. Se repite en el panel
 * de marca y en el panel del formulario del login (W-01), con paletas
 * distintas por variant.
 */
export function Logo({ variant = "surface", size = "md" }: LogoProps) {
  const isBrand = variant === "brand";

  return (
    <div className="flex items-center gap-2.5">
      <div
        className={[
          "relative shrink-0 rounded-md",
          iconSizeClasses[size],
          isBrand ? "bg-white" : "bg-clin",
        ].join(" ")}
      >
        <span
          className={[
            "absolute -right-[3px] -bottom-[3px] h-2.5 w-2.5 rounded-sm border-2",
            isBrand ? "bg-gym border-brand" : "bg-gym border-bg",
          ].join(" ")}
        />
      </div>
      <span
        className={[
          "font-heading font-bold tracking-tight",
          textSizeClasses[size],
          isBrand ? "text-white" : "text-ink",
        ].join(" ")}
      >
        Vitalys
      </span>
    </div>
  );
}
