import type { ButtonHTMLAttributes } from "react";
import { Spinner } from "../Spinner";

export type ButtonVariant =
  | "primary"
  | "gym"
  | "ok"
  | "bad"
  | "warn"
  | "tonal-ok"
  | "tonal-bad"
  | "outline"
  | "neutral"
  | "outline-bad"
  | "ghost-bad"
  | "ghost";

export type ButtonSize = "xs" | "sm" | "tabla" | "cta" | "md" | "modal" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * `primary`: acción principal (teal). `gym`/`ok`/`bad`: acción sólida de dominio (gimnasio,
   * confirmación, destructiva). `tonal-ok`/`tonal-bad`: fondo suave con borde (Atendido / Ausente).
   * `outline`: acción secundaria con borde. `ghost`: sin fondo, para acciones ícono.
   */
  variant?: ButtonVariant;
  /**
   * Altura del mockup: `xs` 36px (botón de tema del login), `sm` 38px (acciones de tabla), `tabla` 40px (Cancelar / Atendido en filas), `cta` 42px (acciones de las tarjetas de
   * Pagos), `md` 44px, `modal` 46px (botones de los diálogos), `lg` 48px (auth, 15px). Por defecto `outline` es `sm` y el resto `md`.
   */
  size?: ButtonSize;
  /** `lg` redondea a 10px (botones "+ Nueva persona" / "+ Nuevo profesional" y sus buscadores). */
  esquinas?: "md" | "lg";
  /** Ocupa todo el ancho del contenedor (login, registro). Por defecto el botón mide lo que su texto. */
  fullWidth?: boolean;
  /**
   * Acción en curso: el botón queda deshabilitado (`aria-busy`) y muestra el spinner sm a la
   * izquierda de `textoCargando` ("Guardando…"). No cambia de ancho: reserva el lugar del más
   * largo de los dos textos. Sin `textoCargando`, el spinner acompaña al texto de siempre.
   */
  cargando?: boolean;
  /** Texto mientras `cargando` (p.ej. "Registrando pago…"). Pasarlo siempre fija el ancho. */
  textoCargando?: string;
}

// Sin `font-weight` ni `height` en la base: cada variant/size define los suyos, para no competir
// por la misma propiedad con dos utilidades de igual especificidad (ver README de
// `src/components/`, sección Tailwind). Mínimo de área táctil: `md`/`lg` >= 44px.
const baseClasses =
  "inline-flex items-center justify-center transition-colors " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clin-soft " +
  "disabled:cursor-not-allowed disabled:opacity-45 aria-busy:disabled:opacity-100!";

// Calco de los botones del mockup: sólidos `font-semibold` (14px; el 15px es del tamaño `lg`) con `hover:brightness-110`
// (`style-hover="filter:brightness(1.08)"`), tonales con borde del color del estado.
const SOLIDO = "px-[18px] font-semibold hover:brightness-110";
const TONAL = "border-[1.5px] px-3.5 text-[13px] font-semibold";

const variantClasses: Record<ButtonVariant, string> = {
  primary: `${SOLIDO} bg-clin text-on-clin`,
  gym: `${SOLIDO} bg-gym text-on-gym`,
  ok: `${SOLIDO} bg-ok text-white`,
  // Autorizar excepción: ámbar con texto oscuro fijo (`#1E1400` en el mockup).
  warn: "bg-warn px-[18px] font-semibold text-[#1E1400] hover:brightness-110 disabled:opacity-50!",
  bad: `${SOLIDO} bg-bad text-white`,
  "tonal-ok": `${TONAL} border-ok bg-ok-soft text-ok-ink`,
  "tonal-bad": `${TONAL} border-bad bg-bad-soft text-bad-ink`,
  // Calco del botón de tema del mockup (`border:1px solid var(--border);border-radius:8px;
  // background:var(--surface);color:var(--text-2)`): acción secundaria con borde visible.
  outline:
    "border border-border bg-surface px-3 text-[13px] font-medium text-ink-2 hover:border-clin",
  // `min-w-11`: botones ícono-only (mostrar/ocultar contraseña) necesitan área táctil de 44px.
  // Acción secundaria de las tarjetas ("Operar como", "Ir a Pagos", "Cambiar persona"): borde
  // `border-2` y texto pleno. El tamaño del texto lo define quien lo usa (13px en tablas).
  neutral: "border border-border-2 bg-transparent px-4 font-medium text-ink hover:bg-surface-2",
  // "Cancelar" de las tablas del socio: borde `border-2` y texto rojo, sin fondo.
  "outline-bad":
    "border border-border-2 bg-transparent px-3.5 text-[13px] font-medium text-bad-ink hover:border-bad",
  // "Cancelar turno" de Inicio: texto rojo sin borde ni fondo.
  "ghost-bad": "bg-transparent px-4 font-medium text-bad-ink hover:bg-bad-soft",
  ghost: "min-h-11 min-w-11 bg-transparent px-2 py-1 text-lg text-ink-2 hover:text-ink",
};

const sizeClasses: Record<ButtonSize, string> = {
  xs: "h-9",
  sm: "h-[38px]",
  tabla: "h-10",
  cta: "h-[42px]",
  md: "h-11",
  modal: "h-[46px]",
  lg: "h-12 text-[15px]",
};

/** Átomo de botón. Presentacional puro: no conoce routing ni auth. */
export function Button({
  variant = "primary",
  size,
  esquinas = "md",
  fullWidth = false,
  cargando = false,
  textoCargando,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const tamano =
    variant === "ghost" ? "" : sizeClasses[size ?? (variant === "outline" ? "sm" : "md")];
  const classes = [
    baseClasses,
    esquinas === "lg" ? "rounded-[10px]" : "rounded-md",
    variantClasses[variant],
    tamano,
    fullWidth ? "w-full" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  // Botones de fondo transparente o con borde: el spinner es teal sobre aro gris; en el resto
  // (sólidos y tonales) toma el color del texto.
  const sobreColor = variant !== "outline" && variant !== "neutral" && variant !== "ghost";
  const conTexto = cargando || textoCargando !== undefined;
  return (
    <button
      {...props}
      disabled={disabled || cargando}
      aria-busy={cargando || undefined}
      className={classes}
    >
      {conTexto ? (
        // Grilla de una celda: los dos textos ocupan el mismo lugar y el botón mide el más largo.
        <span className="inline-grid items-center justify-items-center">
          <span
            aria-hidden={cargando || undefined}
            className={`col-start-1 row-start-1 ${cargando ? "invisible" : ""}`}
          >
            {children}
          </span>
          <span
            aria-hidden={!cargando || undefined}
            className={`col-start-1 row-start-1 inline-flex items-center gap-2 ${cargando ? "" : "invisible"}`}
          >
            <Spinner tamano="sm" sobreColor={sobreColor} />
            {textoCargando ?? children}
          </span>
        </span>
      ) : (
        children
      )}
    </button>
  );
}
