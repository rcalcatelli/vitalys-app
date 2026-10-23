import type { ReactNode } from "react";

export interface PageHeaderProps {
  /** Línea chica sobre el título (sección, fecha, persona). */
  eyebrow?: string;
  titulo: string;
  subtitulo?: string;
  /** Contenido a la derecha (botones de acción, chip de fecha/hora). */
  acciones?: ReactNode;
}

/**
 * Molécula: cabecera de pantalla del mockup (eyebrow, h1 de Schibsted Grotesk 26/32px, subtítulo
 * y acciones a la derecha). Reemplaza las cabeceras sueltas de cada page.
 */
export function PageHeader({ eyebrow, titulo, subtitulo, acciones }: PageHeaderProps) {
  return (
    <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {eyebrow && <div className="mb-1 text-caption text-ink-3">{eyebrow}</div>}
        <h1 className="font-heading text-[26px] leading-[1.1] font-semibold tracking-[-0.015em] text-balance text-ink shell:text-[32px]">
          {titulo}
        </h1>
        {subtitulo && <p className="mt-1.5 text-pretty text-ink-2">{subtitulo}</p>}
      </div>
      {acciones}
    </header>
  );
}
