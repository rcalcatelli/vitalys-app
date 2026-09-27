import { Logo } from "../../atoms/Logo";

/**
 * Organismo del panel de marca del login (W-01, mitad izquierda del mockup):
 * logo, titular, bajada, leyenda de horarios/servicios y pie. Contenido
 * 100% estático (sin props): es copy fijo del centro, no datos de negocio
 * que varíen en runtime, así que no necesita conectarse a nada.
 *
 * Fondo y texto son literales (`bg-brand`/`text-white`, no `text-ink`):
 * el mockup fija este panel en blanco-sobre-teal sin importar el tema
 * claro/oscuro de la app (`background:var(--brand)` sí seguía el tema, pero
 * el texto y el logo interno eran `#FFFFFF` fijos en ambos temas) — por eso
 * `bg-brand` sigue siendo un token (varía con el tema) pero el texto no.
 *
 * Oculto en mobile (`hidden md:flex`, ver decisión de mobile-first en
 * `components/README.md`): en una pantalla angosta este panel se comería
 * el alto disponible antes de llegar al formulario, que es la prioridad.
 */
export function BrandPanel() {
  return (
    <div className="hidden md:flex md:flex-1 md:min-h-screen md:flex-col md:justify-between md:gap-10 md:bg-brand md:p-10 lg:p-12">
      <Logo variant="brand" size="lg" />

      <div className="flex max-w-md flex-col gap-4">
        <h1 className="text-pretty font-heading text-3xl leading-tight font-semibold tracking-tight text-white lg:text-5xl">
          Tu salud y tu entrenamiento, en una sola cuenta.
        </h1>
        <p className="text-pretty text-base text-white/85">
          Reservá el gimnasio y pedí turno con Nutrición, Psicología o Kinesiología desde el mismo
          lugar.
        </p>
        <ul className="mt-2 flex flex-col gap-2.5 text-sm text-white">
          <li className="flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm bg-gym" aria-hidden="true" />
            Gimnasio · lun a vie 07–22 · sáb 09–13
          </li>
          <li className="flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm bg-white" aria-hidden="true" />
            Consultorios · Nutrición, Psicología, Kinesiología
          </li>
        </ul>
      </div>

      <p className="text-xs text-white/70">Centro de salud Vitalys</p>
    </div>
  );
}
