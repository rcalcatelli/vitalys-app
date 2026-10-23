import { Button } from "../../atoms/Button";
import { FieldError } from "../../atoms/FieldError";
import { TurnosAfectadosList } from "../../molecules/TurnosAfectadosList";
import type { Impacto, Profesional } from "../../../types/profesional";
import { etiquetaEspecialidad, nombreProfesional } from "../../../utils/formato";

export interface BajaProfesionalDialogProps {
  profesional: Profesional;
  /** Impacto del paso 1 (RN-25). `null` mientras se consulta. */
  impacto: Impacto | null;
  error?: string | null;
  /** Hay un DELETE en curso. */
  cargando?: boolean;
  onConfirmar: () => void;
  onVolver: () => void;
}

/**
 * Contenido del modal de baja en dos pasos (RN-25). El paso 1 (impacto) ya lo resolvió la
 * page: acá se muestran los turnos futuros que se cancelarían y el botón confirma con el
 * texto que corresponde. Presentacional puro.
 */
export function BajaProfesionalDialog({
  profesional,
  impacto,
  error = null,
  cargando = false,
  onConfirmar,
  onVolver,
}: BajaProfesionalDialogProps) {
  const cantidad = impacto?.cantidad ?? 0;
  const textoConfirmar =
    cantidad > 0
      ? `Cancelar ${cantidad} ${cantidad === 1 ? "turno" : "turnos"} y dar de baja`
      : "Dar de baja";

  return (
    <>
      <div className="flex flex-col gap-0.5 rounded-lg bg-surface-2 px-3.5 py-3">
        <span className="font-semibold text-ink">{nombreProfesional(profesional)}</span>
        <span className="text-sm text-ink-2">
          {etiquetaEspecialidad(profesional.especialidad)} · {profesional.duracionTurnoMinutos} min
        </span>
      </div>
      <p className="text-ink-2">
        {profesional.nombre} {profesional.apellido} no podrá ingresar ni recibir turnos. Podés
        reactivar su cuenta cuando quieras.
      </p>

      {impacto === null && !error && (
        <p className="text-sm text-ink-3">Revisando turnos futuros…</p>
      )}

      {impacto !== null && cantidad > 0 && (
        <>
          <span className="font-semibold text-ink">
            {cantidad === 1
              ? "Tiene 1 turno futuro que se va a cancelar:"
              : `Tiene ${cantidad} turnos futuros que se van a cancelar:`}
          </span>
          <TurnosAfectadosList turnos={impacto.turnos} />
          <div className="flex flex-col gap-0.5 rounded-lg bg-warn-soft px-3.5 py-3 text-sm text-warn-ink">
            <strong className="font-semibold">Se notificará a cada paciente por email.</strong>
            <span>Los turnos pasados no se modifican.</span>
          </div>
        </>
      )}

      {error && <FieldError>{error}</FieldError>}

      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" size="md" onClick={onVolver}>
          Volver
        </Button>
        <Button
          type="button"
          variant="bad"
          disabled={impacto === null || cargando}
          onClick={onConfirmar}
        >
          {cargando ? "Dando de baja…" : textoConfirmar}
        </Button>
      </div>
    </>
  );
}
