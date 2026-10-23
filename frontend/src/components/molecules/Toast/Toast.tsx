export interface ToastProps {
  mensaje: string;
  /** En mobile baja a 64px para no taparse con el header de 56px. */
  mobile?: boolean;
}

/**
 * Molécula: aviso efímero del mockup (centrado arriba, fondo `ink` con texto `bg`, entra con
 * `vtIn`). `role="status"` + `aria-live="polite"` para que los lectores de pantalla lo anuncien
 * sin interrumpir. Presentacional puro: quién lo muestra y cuánto dura lo decide `ToastProvider`.
 */
export function Toast({ mensaje, mobile = false }: ToastProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{ top: mobile ? 64 : 20 }}
      className="fixed left-1/2 z-60 max-w-[calc(100%-32px)] -translate-x-1/2 animate-vt-in rounded-[10px] bg-ink px-4 py-3 text-[13.5px] font-medium text-bg shadow-[0_10px_30px_rgba(0,0,0,0.2)]"
    >
      {mensaje}
    </div>
  );
}
