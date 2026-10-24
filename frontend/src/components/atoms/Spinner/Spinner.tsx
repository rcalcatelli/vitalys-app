export type SpinnerTamano = "sm" | "md" | "lg";

export interface SpinnerProps {
  /** `sm` 16px (botones), `md` 24px (tarjetas y listas), `lg` 32px (pantalla completa). */
  tamano?: SpinnerTamano;
  /**
   * Variante sobre un fondo de color (botones sólidos): el trazo toma el color del texto
   * (`currentColor`) y el resto del aro queda a 30%. Por defecto: trazo teal sobre aro gris.
   */
  sobreColor?: boolean;
  /**
   * Lo anuncia por su cuenta (`role="status"` + texto oculto "Cargando"), para un spinner solo,
   * sin texto visible al lado. Si ya hay un texto o un contenedor `role="status"`, no se usa.
   */
  anunciar?: boolean;
  /** Texto que lee el lector de pantalla cuando `anunciar` está activo. */
  etiqueta?: string;
}

// Medidas del diseño: 16px/2px, 24px/2,5px, 32px/3px.
const TAMANOS: Record<SpinnerTamano, string> = {
  sm: "size-4 border-2",
  md: "size-6 border-[2.5px]",
  lg: "size-8 border-3",
};

const COLORES = {
  normal: "border-border border-t-clin",
  sobreColor: "border-[color-mix(in_srgb,currentColor_30%,transparent)] border-t-current",
};

/**
 * Átomo: aro que gira (0,75 s). Con `prefers-reduced-motion` no gira: late. Es decorativo
 * (`aria-hidden`); el anuncio lo hace el contenedor `role="status"` o `anunciar`.
 */
export function Spinner({
  tamano = "md",
  sobreColor = false,
  anunciar = false,
  etiqueta = "Cargando",
}: SpinnerProps) {
  const aro = (
    <span
      aria-hidden="true"
      data-testid="spinner"
      className={`inline-block shrink-0 animate-vt-spin rounded-full motion-reduce:animate-vt-pulse ${TAMANOS[tamano]} ${
        sobreColor ? COLORES.sobreColor : COLORES.normal
      }`}
    />
  );
  if (!anunciar) return aro;
  return (
    <div role="status" className="flex">
      {aro}
      <span className="sr-only">{etiqueta}</span>
    </div>
  );
}
