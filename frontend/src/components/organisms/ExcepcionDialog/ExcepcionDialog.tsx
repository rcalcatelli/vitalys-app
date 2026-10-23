import { useState } from "react";
import { Button } from "../../atoms/Button";
import { Label } from "../../atoms/Label";

export interface DatosExcepcion {
  motivo: string;
  /** `YYYY-MM-DD`. */
  validaHasta: string;
  unSoloUso: boolean;
}

export interface ExcepcionDialogProps {
  nombre: string;
  periodosImpagos: number;
  /** Hoy en Buenos Aires (`YYYY-MM-DD`): la excepción no puede vencer antes. */
  hoy: string;
  enviando?: boolean;
  /** Error del servidor (422 si la persona no está suspendida, 403 si no es ADMIN...). */
  error?: string | null;
  onConfirmar: (datos: DatosExcepcion) => void;
  onCancelar: () => void;
}

const MOTIVO_MAXIMO = 500;
const ERROR = "text-caption font-normal text-bad-ink";
const CAMPO =
  "w-full rounded-md border bg-surface text-ink focus:outline-none focus:border-warn focus:ring-[3px] focus:ring-warn-soft";

const MODALIDADES = [
  { unSoloUso: false, etiqueta: "Hasta el vencimiento" },
  { unSoloUso: true, etiqueta: "Una sola reserva" },
];

/**
 * Contenido del modal "Autorizar excepción" (ADMIN, RN-09): habilita a una persona suspendida a
 * reservar gimnasio con motivo obligatorio, vencimiento y modalidad (un solo uso o hasta la fecha).
 * Presentacional: valida la forma; que la persona esté suspendida lo decide el servidor.
 */
export function ExcepcionDialog({
  nombre,
  periodosImpagos,
  hoy,
  enviando = false,
  error = null,
  onConfirmar,
  onCancelar,
}: ExcepcionDialogProps) {
  const [motivo, setMotivo] = useState("");
  const [validaHasta, setValidaHasta] = useState("");
  const [unSoloUso, setUnSoloUso] = useState(false);
  const [tocados, setTocados] = useState<{ motivo?: boolean; fecha?: boolean }>({});

  const errores: { motivo?: string; fecha?: string } = {};
  if (!motivo.trim()) errores.motivo = "Indicá el motivo de la excepción.";
  else if (motivo.trim().length > MOTIVO_MAXIMO)
    errores.motivo = `El motivo no puede superar los ${MOTIVO_MAXIMO} caracteres.`;
  if (!validaHasta) errores.fecha = "Elegí hasta cuándo vale la excepción.";
  else if (validaHasta < hoy) errores.fecha = "La fecha no puede ser anterior a hoy.";
  const invalido = Object.keys(errores).length > 0;

  function confirmar() {
    if (invalido || enviando) return;
    onConfirmar({ motivo: motivo.trim(), validaHasta, unSoloUso });
  }

  return (
    <>
      <div className="rounded-[10px] bg-warn-soft px-3.5 py-3 text-[13.5px] text-pretty text-warn-ink">
        Habilita a <strong className="font-semibold">{nombre}</strong> a reservar el gimnasio aunque
        tenga {periodosImpagos} períodos impagos. Queda registrada con tu usuario, fecha y motivo.
      </div>

      {error && (
        <div
          role="alert"
          className="flex flex-col gap-[3px] rounded-[10px] bg-bad-soft px-3.5 py-3 text-[13.5px] text-bad-ink"
        >
          <strong className="font-semibold">No se pudo autorizar la excepción</strong>
          <span className="text-pretty">{error}</span>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="excepcion-motivo">Motivo</Label>
        <textarea
          id="excepcion-motivo"
          rows={3}
          placeholder="Ej.: pagará el viernes, acordado con administración"
          value={motivo}
          maxLength={MOTIVO_MAXIMO + 50}
          onChange={(e) => {
            setMotivo(e.target.value);
            setTocados((t) => ({ ...t, motivo: true }));
          }}
          onBlur={() => setTocados((t) => ({ ...t, motivo: true }))}
          aria-invalid={tocados.motivo && errores.motivo ? true : undefined}
          className={`${CAMPO} resize-y px-3 py-2.5 text-sm ${tocados.motivo && errores.motivo ? "border-bad" : "border-border-2"}`}
        />
        {tocados.motivo && errores.motivo && <span className={ERROR}>{errores.motivo}</span>}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="excepcion-hasta">Válida hasta</Label>
        <input
          id="excepcion-hasta"
          type="date"
          min={hoy}
          value={validaHasta}
          onChange={(e) => {
            setValidaHasta(e.target.value);
            setTocados((t) => ({ ...t, fecha: true }));
          }}
          onBlur={() => setTocados((t) => ({ ...t, fecha: true }))}
          aria-invalid={tocados.fecha && errores.fecha ? true : undefined}
          className={`${CAMPO} h-11 px-3 font-mono text-sm ${tocados.fecha && errores.fecha ? "border-bad" : "border-border-2"}`}
        />
        {tocados.fecha && errores.fecha && <span className={ERROR}>{errores.fecha}</span>}
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-small font-medium text-ink-2">Modalidad</span>
        <div role="group" aria-label="Modalidad" className="grid grid-cols-2 gap-2">
          {MODALIDADES.map((m) => {
            const activo = unSoloUso === m.unSoloUso;
            return (
              <button
                key={m.etiqueta}
                type="button"
                aria-pressed={activo}
                onClick={() => setUnSoloUso(m.unSoloUso)}
                className={[
                  "min-h-11 rounded-md border-[1.5px] px-2.5 py-1.5 text-[13.5px] font-medium",
                  activo
                    ? "border-warn bg-warn-soft text-warn-ink"
                    : "border-border-2 bg-surface text-ink-2",
                ].join(" ")}
              >
                {m.etiqueta}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="neutral" size="modal" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button
          type="button"
          variant="warn"
          size="modal"
          disabled={invalido}
          cargando={enviando}
          textoCargando="Autorizando…"
          onClick={confirmar}
        >
          Autorizar
        </Button>
      </div>
    </>
  );
}
