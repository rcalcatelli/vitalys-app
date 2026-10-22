import type { ReactNode } from "react";
import { Button } from "../../atoms/Button";

export interface PantallaLayoutProps {
  /** Sobretítulo en mayúsculas (rol / sección). */
  eyebrow: string;
  titulo: string;
  subtitulo?: string;
  email?: string;
  onLogout: () => void;
  /** Navegación del rol (SocioNav / ProfesionalNav). */
  nav: ReactNode;
  children: ReactNode;
}

/** Template de las pantallas de turnos: cabecera con sesión, navegación del rol y contenido. */
export function PantallaLayout({
  eyebrow,
  titulo,
  subtitulo,
  email,
  onLogout,
  nav,
  children,
}: PantallaLayoutProps) {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-6 sm:px-6 sm:py-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold tracking-wider text-ink-3 uppercase">
            {eyebrow}
          </span>
          <h1 className="font-heading text-2xl font-semibold text-ink sm:text-3xl">{titulo}</h1>
          {subtitulo && <p className="text-sm text-ink-2">{subtitulo}</p>}
        </div>
        <div className="flex items-center gap-3">
          {email && <span className="hidden text-sm text-ink-3 sm:inline">{email}</span>}
          <Button type="button" variant="outline" onClick={onLogout}>
            Cerrar sesión
          </Button>
        </div>
      </header>
      {nav}
      {children}
    </main>
  );
}
