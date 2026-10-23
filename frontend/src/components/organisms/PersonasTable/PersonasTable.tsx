import { useState } from "react";
import { Button } from "../../atoms/Button";
import { Chip } from "../../atoms/Chip";
import type { Persona } from "../../../types/persona";
import { chipCuota, serviciosDe } from "../../../utils/personaUi";

export interface PersonasTableProps {
  personas: Persona[];
  onEditar: (persona: Persona) => void;
  onBaja: (persona: Persona) => void;
  onReactivar: (persona: Persona) => void;
  /** "Operar como": solo se ofrece a quien tiene un usuario de socio activo (RF-39, RF-43). */
  onOperarComo: (persona: Persona) => void;
  /** Deshabilita las acciones mientras hay una operación en curso. */
  ocupado?: boolean;
}

const COLUMNAS = "shell:grid-cols-[1.5fr_1fr_1.7fr_1.4fr_160px]";

/**
 * Listado de Personas (ADMIN). En mobile cada persona es una tarjeta de dos columnas; desde 760px
 * pasa a la tabla del mockup (Nombre, DNI, Servicios, Cuota y acciones). La acción principal es
 * "Operar como"; Editar y Baja/Reactivar viven en el menú ⋯. La baja pide una confirmación en la
 * misma fila: es una acción sobre la ficha de otra persona y no se dispara con un solo toque.
 */
export function PersonasTable({
  personas,
  onEditar,
  onBaja,
  onReactivar,
  onOperarComo,
  ocupado = false,
}: PersonasTableProps) {
  const [confirmandoId, setConfirmandoId] = useState<number | null>(null);
  const [menuAbiertoId, setMenuAbiertoId] = useState<number | null>(null);

  if (personas.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface px-4 py-5 text-ink-3">
        No hay personas que coincidan.
      </div>
    );
  }

  return (
    <div className="overflow-visible rounded-xl border border-border bg-surface">
      <div
        className={`hidden gap-3 rounded-t-xl bg-surface-2 px-4 py-2.5 text-xs font-semibold tracking-[0.05em] text-ink-3 uppercase shell:grid ${COLUMNAS}`}
      >
        <span>Nombre</span>
        <span>DNI</span>
        <span>Servicios</span>
        <span>Cuota</span>
        <span className="sr-only">Acciones</span>
      </div>
      <ul>
        {personas.map((p) => {
          const activa = p.estado === "ACTIVO";
          const confirmando = confirmandoId === p.id;
          const menuAbierto = menuAbiertoId === p.id;
          const nombre = `${p.nombre} ${p.apellido}`;
          const cuota = chipCuota(p);
          return (
            <li
              key={p.id}
              data-testid={`persona-${p.id}`}
              className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 border-t border-border px-4 py-3 first:border-t-0 shell:first:border-t ${COLUMNAS} ${activa ? "" : "opacity-60"}`}
            >
              <span className="flex min-w-0 flex-col">
                <span className="font-medium text-ink">{nombre}</span>
                <span className="truncate text-xs text-ink-3">{p.email}</span>
              </span>
              <span className="text-right font-mono text-small text-ink-2 shell:text-left">
                {p.dni}
              </span>
              <span className="flex flex-wrap gap-1">
                {serviciosDe(p).map((s) => (
                  <Chip key={s.label} tone={s.tone} tamano="etiqueta">
                    {s.label}
                  </Chip>
                ))}
              </span>
              <span className="justify-self-end shell:justify-self-start">
                <Chip tone={cuota.tone} dot>
                  {cuota.label}
                </Chip>
              </span>
              <span className="col-span-2 flex flex-wrap items-center justify-end gap-1.5 shell:col-span-1">
                {confirmando ? (
                  <>
                    <span className="self-center text-sm text-ink-2">¿Dar de baja?</span>
                    <Button
                      type="button"
                      variant="neutral"
                      size="sm"
                      disabled={ocupado}
                      className="px-3 text-small hover:border-bad"
                      onClick={() => {
                        setConfirmandoId(null);
                        onBaja(p);
                      }}
                    >
                      Sí, dar de baja
                    </Button>
                    <Button
                      type="button"
                      variant="neutral"
                      size="sm"
                      className="px-3 text-small"
                      onClick={() => setConfirmandoId(null)}
                    >
                      No
                    </Button>
                  </>
                ) : (
                  <>
                    {activa && p.tieneUsuarioSocio && (
                      <Button
                        type="button"
                        variant="neutral"
                        size="sm"
                        disabled={ocupado}
                        aria-label={`Operar como ${nombre}`}
                        className="px-3 text-small whitespace-nowrap"
                        onClick={() => onOperarComo(p)}
                      >
                        Operar como
                      </Button>
                    )}
                    <span className="relative flex">
                      <Button
                        type="button"
                        variant="neutral"
                        size="sm"
                        disabled={ocupado}
                        aria-label={`Más acciones de ${nombre}`}
                        aria-expanded={menuAbierto}
                        className="w-[38px] px-0 text-small font-bold"
                        onClick={() => setMenuAbiertoId(menuAbierto ? null : p.id)}
                      >
                        ⋯
                      </Button>
                      {menuAbierto && (
                        <>
                          <div
                            role="presentation"
                            onClick={() => setMenuAbiertoId(null)}
                            className="fixed inset-0 z-40"
                          />
                          <div className="absolute top-[calc(100%+4px)] right-0 z-41 min-w-44 rounded-lg border border-border bg-surface p-1 shadow-lg">
                            {activa && (
                              <button
                                type="button"
                                className="h-11 w-full rounded-md px-3 text-left text-sm font-medium text-ink hover:bg-surface-2"
                                onClick={() => {
                                  setMenuAbiertoId(null);
                                  onEditar(p);
                                }}
                              >
                                Editar
                              </button>
                            )}
                            <button
                              type="button"
                              className={`h-11 w-full rounded-md px-3 text-left text-sm font-semibold hover:bg-surface-2 ${activa ? "text-bad-ink" : "text-clin-ink"}`}
                              onClick={() => {
                                setMenuAbiertoId(null);
                                if (activa) setConfirmandoId(p.id);
                                else onReactivar(p);
                              }}
                            >
                              {activa ? "Dar de baja" : "Reactivar"}
                            </button>
                          </div>
                        </>
                      )}
                    </span>
                  </>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
