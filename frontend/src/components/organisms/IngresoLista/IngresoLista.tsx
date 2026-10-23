import type { Turno } from "../../../types/turno";
import { horaBA } from "../../../utils/fechaBA";
import { Button } from "../../atoms/Button";
import { Chip } from "../../atoms/Chip";

export interface IngresoListaProps {
  /** Turnos ya filtrados y ordenados: pendientes primero. */
  turnos: Turno[];
  /** Id del turno cuyo ingreso se está registrando (deshabilita su botón). */
  marcandoId: number | null;
  onMarcar: (turno: Turno) => void;
  /** Texto cuando la lista está vacía. */
  vacio: string;
}

/**
 * Organismo presentacional: personas de la franja con "Marcar ingreso" (pendientes) o
 * "Ingresó HH:MM" (ya ingresadas). No hay "Deshacer": un ingreso registrado no se revierte.
 */
export function IngresoLista({ turnos, marcandoId, onMarcar, vacio }: IngresoListaProps) {
  return (
    <ul className="overflow-hidden rounded-xl border border-border bg-surface">
      {turnos.length === 0 && <li className="px-4 py-5 text-ink-3">{vacio}</li>}
      {turnos.map((t) => (
        <li
          key={t.id}
          className="flex min-h-[62px] items-center gap-3 border-t border-border px-3.5 py-2.5 first:border-t-0"
        >
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="font-medium">{`${t.personaNombre} ${t.personaApellido}`}</span>
            <span className="text-caption text-ink-3">
              DNI <span className="font-mono">{t.personaDni}</span>
            </span>
          </div>
          {t.estado === "COMPLETADO" && (
            <Chip tone="ok">
              Ingresó
              {t.completadoEn && <span className="font-mono">{horaBA(t.completadoEn)}</span>}
            </Chip>
          )}
          {t.estado === "AUSENTE" && <Chip tone="bad">Ausente</Chip>}
          {t.estado === "RESERVADO" && (
            <Button
              variant="gym"
              className="px-4! whitespace-nowrap"
              disabled={marcandoId === t.id}
              onClick={() => onMarcar(t)}
            >
              Marcar ingreso
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}
