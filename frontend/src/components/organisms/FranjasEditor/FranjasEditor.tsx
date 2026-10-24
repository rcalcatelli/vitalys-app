import { Button } from "../../atoms/Button";
import { Select } from "../../atoms/Select";
import type { FranjaEditable } from "../../../types/disponibilidad";
import { diasVisibles, nombreDia, opcionesDeHora } from "../../../utils/disponibilidad";

export interface FranjasEditorProps {
  filas: FranjaEditable[];
  /** Mensaje de error por `clave` de fila (validación del cliente). */
  errores: Record<string, string>;
  /** Hay cambios sin guardar respecto de lo que está en el servidor. */
  hayCambios: boolean;
  guardando?: boolean;
  onCambiar: (clave: string, cambio: Partial<Omit<FranjaEditable, "clave">>) => void;
  onAgregar: () => void;
  onQuitar: (clave: string) => void;
  onDescartar: () => void;
  onGuardar: () => void;
}

const HORAS = opcionesDeHora();

/** Las horas de la grilla más la que ya tenga la fila, por si el servidor guardó una fuera de los 30 min. */
function horasPara(actual: string): string[] {
  return HORAS.includes(actual) ? HORAS : [...HORAS, actual].sort();
}

/**
 * Editor de franjas semanales (RF-14): una fila por franja con día, desde y hasta, el error
 * de validación junto a la fila y las acciones Descartar / Guardar cambios. Presentacional puro:
 * el borrador y el guardado viven en la page.
 */
export function FranjasEditor({
  filas,
  errores,
  hayCambios,
  guardando = false,
  onCambiar,
  onAgregar,
  onQuitar,
  onDescartar,
  onGuardar,
}: FranjasEditorProps) {
  const hayErrores = Object.keys(errores).length > 0;
  // El domingo es opción solo si ya hay una franja ese día (el mockup atiende de lunes a sábado).
  const dias = diasVisibles(filas);

  return (
    <section
      aria-label="Franjas"
      className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 lg:flex-[1_1_300px]"
    >
      <h2 className="font-heading text-[17px] font-semibold text-ink">Franjas</h2>

      {filas.map((fila, i) => {
        const error = errores[fila.clave];
        return (
          <div
            key={fila.clave}
            role="group"
            aria-label={`Franja ${i + 1}`}
            className={[
              "flex flex-col gap-1.5 rounded-[10px] border-[1.5px] p-2.5",
              error ? "border-bad bg-bad-soft" : "border-border bg-transparent",
            ].join(" ")}
          >
            <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_2.5rem] items-center gap-1.5">
              <Select
                aria-label="Día"
                className="h-[42px]! px-1.5! text-[13.5px]!"
                value={String(fila.diaSemana)}
                onChange={(v) => onCambiar(fila.clave, { diaSemana: Number(v) })}
              >
                {dias.map((d) => (
                  <option key={d} value={d}>
                    {nombreDia(d)}
                  </option>
                ))}
              </Select>
              <Select
                aria-label="Desde"
                className="h-[42px]! px-1.5! font-mono text-[13px]!"
                value={fila.horaInicio}
                onChange={(v) => onCambiar(fila.clave, { horaInicio: v })}
              >
                {horasPara(fila.horaInicio).map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </Select>
              <Select
                aria-label="Hasta"
                className="h-[42px]! px-1.5! font-mono text-[13px]!"
                value={fila.horaFin}
                onChange={(v) => onCambiar(fila.clave, { horaFin: v })}
              >
                {horasPara(fila.horaFin).map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </Select>
              <button
                type="button"
                aria-label="Quitar franja"
                onClick={() => onQuitar(fila.clave)}
                className="h-[42px] rounded-md text-lg text-ink-3 hover:text-bad-ink"
              >
                ×
              </button>
            </div>
            {error && <span className="text-xs text-bad-ink">{error}</span>}
          </div>
        );
      })}

      {filas.length === 0 && <span className="text-sm text-ink-3">Sin franjas cargadas.</span>}

      <button
        type="button"
        onClick={onAgregar}
        className="h-11 rounded-[10px] border border-dashed border-border-2 font-semibold text-clin-ink"
      >
        + Agregar franja
      </button>

      <div className="flex justify-end gap-2 pt-1">
        <Button
          size="md"
          type="button"
          variant="neutral"
          className="px-3.5! font-normal! disabled:opacity-50!"
          disabled={!hayCambios || guardando}
          onClick={onDescartar}
        >
          Descartar
        </Button>
        <Button
          type="button"
          className="disabled:opacity-45!"
          disabled={!hayCambios || hayErrores}
          cargando={guardando}
          textoCargando="Guardando…"
          onClick={onGuardar}
        >
          Guardar cambios
        </Button>
      </div>
    </section>
  );
}
