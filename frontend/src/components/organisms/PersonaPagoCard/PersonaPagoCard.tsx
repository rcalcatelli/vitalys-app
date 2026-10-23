import type { Persona } from "../../../types/persona";
import { inicialesDe, serviciosDe } from "../../../utils/personaUi";
import { Button } from "../../atoms/Button";
import { Chip } from "../../atoms/Chip";

export interface PersonaPagoCardProps {
  persona: Persona;
  onCambiar: () => void;
  onRegistrarPago: () => void;
  /** Solo se ofrece a una persona suspendida (RN-09); sin esta prop no hay botón. */
  onAutorizarExcepcion?: () => void;
  /** Deshabilita "Registrar pago" mientras no cargó el estado de cuenta. */
  pagoDeshabilitado?: boolean;
}

/**
 * Organismo presentacional: persona elegida en Pagos (avatar con iniciales, nombre, DNI y servicios)
 * con "Cambiar persona", "Registrar pago" y, si está suspendida, "Autorizar excepción".
 */
export function PersonaPagoCard({
  persona,
  onCambiar,
  onRegistrarPago,
  onAutorizarExcepcion,
  pagoDeshabilitado = false,
}: PersonaPagoCardProps) {
  return (
    <section
      aria-label="Persona elegida"
      className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-xl border border-border bg-surface px-4 py-3.5"
    >
      <span
        aria-hidden="true"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-clin-soft text-small font-semibold text-clin-ink"
      >
        {inicialesDe(persona)}
      </span>
      <div className="flex min-w-0 flex-[1_1_200px] flex-col gap-1">
        <span className="font-heading text-lg font-semibold">
          {persona.nombre} {persona.apellido}
        </span>
        <span className="flex flex-wrap items-center gap-1.5 text-caption text-ink-3">
          DNI <span className="font-mono">{persona.dni}</span>
          {serviciosDe(persona).map((s) => (
            <Chip key={s.label} tone={s.tone} tamano="etiqueta">
              {s.label}
            </Chip>
          ))}
        </span>
      </div>
      <div className="ml-auto flex flex-wrap gap-2">
        <Button type="button" variant="neutral" onClick={onCambiar}>
          Cambiar persona
        </Button>
        {onAutorizarExcepcion && (
          <Button type="button" variant="neutral" onClick={onAutorizarExcepcion}>
            Autorizar excepción
          </Button>
        )}
        <Button type="button" disabled={pagoDeshabilitado} onClick={onRegistrarPago}>
          Registrar pago
        </Button>
      </div>
    </section>
  );
}
