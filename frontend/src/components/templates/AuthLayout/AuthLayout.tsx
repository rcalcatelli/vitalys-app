import type { ReactNode } from "react";

export interface AuthLayoutProps {
  title: string;
  children: ReactNode;
  /**
   * Contenido debajo del form (p.ej. "¿No tenés cuenta? <Link to="/registro">Registrarse</Link>").
   * Vive en la página, no acá: el template no conoce `react-router`, así que
   * recibe ese markup ya resuelto en vez de armar el link él mismo.
   */
  footer?: ReactNode;
}

/**
 * Template compartido por las pantallas de auth (login/registro, W-01/W-06):
 * define el layout (título + contenido + pie), no la lógica de ningún form en
 * particular. Presentacional puro.
 */
export function AuthLayout({ title, children, footer }: AuthLayoutProps) {
  return (
    // Mobile first: en mobile ocupa el ancho disponible (`w-full`, padding
    // chico); recién a partir de `sm:` se limita a un ancho fijo y se centra.
    // Nunca al revés (un `max-w-*` sin prefijo "corregido" para mobile).
    <main className="w-full flex flex-col gap-4 px-4 py-8 text-center sm:mx-auto sm:my-16 sm:max-w-sm sm:p-6">
      <h1 className="font-heading text-2xl font-semibold text-ink sm:text-4xl">{title}</h1>
      {children}
      {footer}
    </main>
  );
}
