import { Button } from "../../atoms/Button";
import { FieldError } from "../../atoms/FieldError";
import { TurnosAfectadosList } from "../../molecules/TurnosAfectadosList";
import type { Impacto } from "../../../types/profesional";

export interface ConfirmarImpactoDialogProps {
  impacto: Impacto;
  /** `true` si quien edita es el propio profesional ("tu nueva disponibilidad"); si no, se nombra al profesional. */
  esPropia: boolean;
  /** Nombre del profesional afectado (se usa cuando no es la disponibilidad propia). */
  profesional: string;
  error?: string | null;
  cargando?: boolean;
  onConfirmar: () => void;
  onVolver: () => void;
}

/**
 * Contenido del modal "Hay turnos afectados" (RN-24): lista los turnos que la nueva
 * disponibilidad deja sin cobertura y pide confirmar su cancelación. Presentacional puro.
 */
export function ConfirmarImpactoDialog({
  impacto,
  esPropia,
  profesional,
  error = null,
  cargando = false,
  onConfirmar,
  onVolver,
}: ConfirmarImpactoDialogProps) {
  return (
    <>
      <p className="text-ink-2">
        {esPropia
          ? "Estos turnos quedan fuera de tu nueva disponibilidad"
          : `Estos turnos quedan fuera de la nueva disponibilidad de ${profesional}`}{" "}
        y se cancelarán. Se avisará a cada paciente.
      </p>
      <TurnosAfectadosList turnos={impacto.turnos} />
      {error && <FieldError>{error}</FieldError>}
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" size="md" onClick={onVolver}>
          Volver
        </Button>
        <Button type="button" variant="bad" disabled={cargando} onClick={onConfirmar}>
          {cargando ? "Guardando…" : "Cancelar turnos y guardar"}
        </Button>
      </div>
    </>
  );
}
