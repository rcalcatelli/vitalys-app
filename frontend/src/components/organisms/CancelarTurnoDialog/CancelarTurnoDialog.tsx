import { useState } from "react";
import type { Profesional } from "../../../types/profesional";
import type { Turno } from "../../../types/turno";
import { horaBA, horasHasta } from "../../../utils/fechaBA";
import { fechaLarga } from "../../../utils/formato";
import { describirTurno, limiteCancelacionHoras } from "../../../utils/turnoUi";
import { Button } from "../../atoms/Button";
import { FieldError } from "../../atoms/FieldError";
import { Label } from "../../atoms/Label";

export interface CancelarTurnoDialogProps {
  turno: Turno;
  profesionales: Profesional[];
  /** Instante actual inyectado: define si la cancelación es en término. */
  ahora: Date;
  cargando?: boolean;
  onConfirmar: (motivo: string) => void;
  onVolver: () => void;
}

/**
 * Contenido del modal de cancelación: informa si queda en término (24 h consultorio / 2 h gimnasio)
 * y exige un motivo antes de confirmar. El estado final lo decide el servidor.
 */
export function CancelarTurnoDialog({
  turno,
  profesionales,
  ahora,
  cargando = false,
  onConfirmar,
  onVolver,
}: CancelarTurnoDialogProps) {
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { servicio, quien } = describirTurno(turno, profesionales);
  const limite = limiteCancelacionHoras(turno);
  const horas = horasHasta(turno.inicio, ahora);
  const enTermino = horas >= limite;

  function confirmar() {
    const limpio = motivo.trim();
    if (!limpio) {
      setError("Escribí el motivo de la cancelación.");
      return;
    }
    setError(null);
    onConfirmar(limpio);
  }

  return (
    <>
      <div className="flex flex-col gap-0.5 rounded-lg bg-surface-2 px-3.5 py-3 text-[13px]">
        <span className="text-[15px] font-semibold text-ink">
          {quien ? `${servicio} · ${quien}` : servicio}
        </span>
        <span className="text-ink-2">
          {`${fechaLarga(turno.inicio)} · ${horaBA(turno.inicio)} – ${horaBA(turno.fin)}`}
        </span>
      </div>

      <div
        className={[
          "flex flex-col gap-0.5 rounded-lg px-3.5 py-3 text-[13px]",
          enTermino ? "bg-ok-soft text-ok-ink" : "bg-warn-soft text-warn-ink",
        ].join(" ")}
      >
        <strong className="font-semibold">
          {enTermino ? "Cancelación en término" : "Cancelación fuera de término"}
        </strong>
        <span>
          {enTermino
            ? `Faltan ${Math.floor(horas)} h; el límite es ${limite} h antes del turno.`
            : `Faltan menos de ${limite} h. El turno queda registrado como “cancelado fuera de término”.`}
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="motivo-cancelacion">Motivo</Label>
        <textarea
          id="motivo-cancelacion"
          value={motivo}
          maxLength={500}
          rows={3}
          onChange={(event) => setMotivo(event.target.value)}
          aria-invalid={error ? true : undefined}
          className="w-full rounded-md border border-border-2 bg-surface px-3 py-2 text-base text-ink focus:border-clin focus:ring-2 focus:ring-clin-soft focus:outline-none"
        />
      </div>
      {error && <FieldError>{error}</FieldError>}

      <div className="flex gap-2">
        <Button type="button" variant="outline" size="modal" onClick={onVolver}>
          Volver
        </Button>
        <Button type="button" variant="bad" size="modal" disabled={cargando} onClick={confirmar}>
          Confirmar cancelación
        </Button>
      </div>
    </>
  );
}
