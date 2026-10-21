import { useEffect } from "react";
import type { ReactNode } from "react";

export interface ModalProps {
  titulo: string;
  onClose: () => void;
  children: ReactNode;
}

/**
 * Molécula: diálogo modal. En mobile sube desde abajo como hoja (calco del mockup:
 * `align-items:flex-end`, esquinas superiores redondeadas); desde `sm:` se centra.
 * Cierra con Escape o tocando el fondo. Presentacional puro.
 */
export function Modal({ titulo, onClose, children }: ModalProps) {
  useEffect(() => {
    function alTeclear(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", alTeclear);
    return () => document.removeEventListener("keydown", alTeclear);
  }, [onClose]);

  return (
    <div
      role="presentation"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--overlay)] sm:items-center sm:p-5"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-full w-full flex-col gap-4 overflow-y-auto rounded-t-[18px] bg-surface p-5 sm:max-w-lg sm:rounded-2xl"
      >
        <h2 className="font-heading text-xl font-semibold text-ink">{titulo}</h2>
        {children}
      </div>
    </div>
  );
}
