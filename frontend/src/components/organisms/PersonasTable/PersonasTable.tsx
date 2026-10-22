import { useState } from "react";
import { Button } from "../../atoms/Button";
import type { Persona } from "../../../types/persona";

export interface PersonasTableProps {
  personas: Persona[];
  onEditar: (persona: Persona) => void;
  onBaja: (persona: Persona) => void;
  onReactivar: (persona: Persona) => void;
  /** Deshabilita las acciones mientras hay una operación en curso. */
  ocupado?: boolean;
}

/** `2026-05-31` → `31/05/2026`, sin pasar por `Date` para no correr el día por zona horaria. */
function fechaCorta(iso: string): string {
  const [anio, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${anio}`;
}

const chipBase =
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap";

/**
 * Listado de W-05. En mobile cada persona es una tarjeta; desde `md:` pasa a
 * grilla de columnas como la tabla del mockup. La baja pide una confirmación
 * en la misma fila: es una acción sobre la ficha de otra persona y no se
 * dispara con un solo toque.
 */
export function PersonasTable({
  personas,
  onEditar,
  onBaja,
  onReactivar,
  ocupado = false,
}: PersonasTableProps) {
  const [confirmandoId, setConfirmandoId] = useState<number | null>(null);

  if (personas.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface px-4 py-5 text-ink-3">
        No hay personas que coincidan.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="hidden bg-surface-2 px-4 py-2.5 text-xs font-semibold tracking-wider text-ink-3 uppercase md:grid md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_10.5rem] md:gap-3">
        <span>Nombre</span>
        <span>DNI</span>
        <span>Gimnasio</span>
        <span>Estado</span>
        <span className="sr-only">Acciones</span>
      </div>
      <ul>
        {personas.map((p) => {
          const activa = p.estado === "ACTIVO";
          const confirmando = confirmandoId === p.id;
          return (
            <li
              key={p.id}
              data-testid={`persona-${p.id}`}
              className={[
                "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 border-t border-border px-4 py-3 first:border-t-0 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_10.5rem] md:first:border-t",
                activa ? "" : "opacity-60",
              ].join(" ")}
            >
              <span className="flex min-w-0 flex-col">
                <span className="font-medium text-ink">
                  {p.apellido}, {p.nombre}
                </span>
                <span className="truncate text-xs text-ink-3">{p.email}</span>
                {!activa && p.fechaBaja && (
                  <span className="text-xs text-ink-3">Baja el {fechaCorta(p.fechaBaja)}</span>
                )}
              </span>
              <span className="text-right font-mono text-sm text-ink-2 md:text-left">{p.dni}</span>
              <span>
                {p.esSocioGym ? (
                  <span className={`${chipBase} bg-gym-soft text-gym-ink`}>Socio gym</span>
                ) : (
                  <span className="text-sm text-ink-3">—</span>
                )}
              </span>
              <span className="justify-self-end md:justify-self-start">
                <span
                  className={`${chipBase} ${activa ? "bg-ok-soft text-ok-ink" : "bg-surface-2 text-ink-3"}`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {activa ? "Activo" : "Inactivo"}
                </span>
              </span>
              <span className="col-span-2 flex flex-wrap justify-end gap-2 md:col-span-1">
                {confirmando ? (
                  <>
                    <span className="self-center text-sm text-ink-2">¿Dar de baja?</span>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={ocupado}
                      className="hover:border-bad"
                      onClick={() => {
                        setConfirmandoId(null);
                        onBaja(p);
                      }}
                    >
                      Sí, dar de baja
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setConfirmandoId(null)}>
                      No
                    </Button>
                  </>
                ) : activa ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={ocupado}
                      onClick={() => onEditar(p)}
                    >
                      Editar
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={ocupado}
                      onClick={() => setConfirmandoId(p.id)}
                    >
                      Baja
                    </Button>
                  </>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={ocupado}
                    onClick={() => onReactivar(p)}
                  >
                    Reactivar
                  </Button>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
