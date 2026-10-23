import { useEffect } from "react";
import { createPortal } from "react-dom";
import type { ReactNode } from "react";

export interface ModalProps {
  titulo: string;
  onClose: () => void;
  children: ReactNode;
}

/**
 * Molécula: diálogo modal. En mobile sube desde abajo como hoja (calco del mockup:
 * `align-items:flex-end`, esquinas superiores redondeadas); desde 760px se centra, a 460px de ancho máximo.
 * Cierra con Escape o tocando el fondo. Se dibuja en `document.body`. Presentacional puro.
 */
export function Modal({ titulo, onClose, children }: ModalProps) {
  useEffect(() => {
    function alTeclear(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", alTeclear);
    return () => document.removeEventListener("keydown", alTeclear);
  }, [onClose]);

  // En un portal sobre `body`: el shell anima cada pantalla con `transform`, y un ancestro
  // transformado se vuelve el bloque contenedor del `fixed`, con lo que el fondo no cubriría
  // la sidebar y el diálogo se centraría en la pantalla y no en la ventana.
  return createPortal(
    <div
      role="presentation"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--overlay)] shell:items-center shell:p-5"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-[460px] flex-col gap-4 overflow-y-auto rounded-t-[18px] bg-surface px-5 py-[22px] shadow-[0_20px_60px_rgba(0,0,0,0.25)] shell:rounded-2xl"
      >
        <h2 className="font-heading text-[21px] font-semibold text-ink">{titulo}</h2>
        {children}
      </div>
    </div>,
    document.body,
  );
}
