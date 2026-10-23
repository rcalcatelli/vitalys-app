import { useState } from "react";
import { Button } from "../../atoms/Button";
import { Chip } from "../../atoms/Chip";
import type { Profesional } from "../../../types/profesional";
import { etiquetaEspecialidad, nombreProfesional } from "../../../utils/formato";

export interface ProfesionalesTableProps {
  profesionales: Profesional[];
  onDisponibilidad: (profesional: Profesional) => void;
  onEditar: (profesional: Profesional) => void;
  onBaja: (profesional: Profesional) => void;
  onReactivar: (profesional: Profesional) => void;
  /** Deshabilita las acciones mientras hay una operación en curso. */
  ocupado?: boolean;
}

const COLUMNAS = "min-[1100px]:grid-cols-[minmax(160px,1.6fr)_130px_90px_100px_270px]";

/**
 * Listado de Profesionales (ADMIN). Desde 1100px es una tabla de columnas; por debajo,
 * una tarjeta por profesional (calco del mockup). Es el mismo markup con grillas
 * distintas, así no se duplica el árbol ni los controles.
 *
 * El menú ⋯ ofrece "Dar de baja" a un profesional activo y "Reactivar" a uno inactivo
 * (que además tiene la Disponibilidad deshabilitada hasta que vuelva a estar activo).
 */
export function ProfesionalesTable({
  profesionales,
  onDisponibilidad,
  onEditar,
  onBaja,
  onReactivar,
  ocupado = false,
}: ProfesionalesTableProps) {
  const [menuAbiertoId, setMenuAbiertoId] = useState<number | null>(null);

  if (profesionales.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border-2 px-4 py-6 text-center text-ink-2">
        No hay profesionales que coincidan.
      </div>
    );
  }

  return (
    <div className="overflow-visible rounded-xl border border-border bg-surface">
      <div
        className={`hidden gap-3 rounded-t-xl bg-surface-2 px-4 py-2.5 text-xs font-semibold tracking-wider text-ink-3 uppercase min-[1100px]:grid ${COLUMNAS}`}
      >
        <span>Nombre</span>
        <span>Especialidad</span>
        <span>Duración</span>
        <span>Estado</span>
        <span className="text-right">Acciones</span>
      </div>
      <ul>
        {profesionales.map((p) => {
          const menuAbierto = menuAbiertoId === p.id;
          const nombre = nombreProfesional(p);
          return (
            <li
              key={p.id}
              data-testid={`profesional-${p.id}`}
              className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-3 border-t border-border px-4 py-3 first:border-t-0 min-[1100px]:first:border-t ${COLUMNAS}`}
            >
              <span
                className={`flex min-w-0 flex-col min-[1100px]:order-1 ${p.activo ? "" : "opacity-55"}`}
              >
                <span className="font-medium text-ink">{nombre}</span>
                <span className="truncate text-xs text-ink-3">{p.email}</span>
              </span>
              <span className="justify-self-end min-[1100px]:order-4 min-[1100px]:justify-self-start">
                <Chip tone={p.activo ? "ok" : "neutral"} dot>
                  {p.activo ? "Activo" : "Inactivo"}
                </Chip>
              </span>
              <span
                className={`col-span-2 flex flex-wrap items-center gap-2 min-[1100px]:contents ${p.activo ? "" : "opacity-55"}`}
              >
                <span className="min-[1100px]:order-2">
                  <Chip tone="clin" tamano="etiqueta">
                    {etiquetaEspecialidad(p.especialidad)}
                  </Chip>
                </span>
                <span className="font-mono text-sm whitespace-nowrap text-ink-2 min-[1100px]:order-3">
                  {p.duracionTurnoMinutos} min
                  <span className="font-sans text-xs text-ink-3 min-[1100px]:hidden">
                    {" "}
                    por turno
                  </span>
                </span>
              </span>
              <span className="col-span-2 flex justify-end gap-2 border-t border-border pt-3 min-[1100px]:order-5 min-[1100px]:col-span-1 min-[1100px]:border-t-0 min-[1100px]:pt-0">
                <Button
                  type="button"
                  variant="neutral"
                  size="sm"
                  disabled={ocupado || !p.activo}
                  aria-label={`Disponibilidad de ${nombre}`}
                  className="flex-1 px-3 text-small font-semibold text-clin-ink min-[1100px]:flex-none"
                  onClick={() => onDisponibilidad(p)}
                >
                  Disponibilidad
                </Button>
                <Button
                  type="button"
                  variant="neutral"
                  size="sm"
                  disabled={ocupado}
                  aria-label={`Editar ${nombre}`}
                  className="flex-1 px-3 text-small min-[1100px]:flex-none"
                  onClick={() => onEditar(p)}
                >
                  Editar
                </Button>
                <span className="relative flex">
                  <Button
                    type="button"
                    variant="neutral"
                    size="sm"
                    disabled={ocupado}
                    aria-label={`Más acciones de ${nombre}`}
                    aria-expanded={menuAbierto}
                    className="w-11 px-0 text-small font-bold min-[1100px]:w-9"
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
                        <button
                          type="button"
                          className={`h-11 w-full rounded-md px-3 text-left text-sm font-semibold hover:bg-surface-2 ${p.activo ? "text-bad-ink" : "text-clin-ink"}`}
                          onClick={() => {
                            setMenuAbiertoId(null);
                            if (p.activo) onBaja(p);
                            else onReactivar(p);
                          }}
                        >
                          {p.activo ? "Dar de baja" : "Reactivar"}
                        </button>
                      </div>
                    </>
                  )}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
