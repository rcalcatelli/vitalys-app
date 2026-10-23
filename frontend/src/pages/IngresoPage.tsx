import { PageHeader } from "../components/molecules/PageHeader";

/**
 * Ingreso al gimnasio (`/admin/ingreso`). Marcador de posición del shell: el check-in de la
 * franja en curso llega con el slice de pantallas de recepción.
 */
export function IngresoPage() {
  return (
    <>
      <PageHeader eyebrow="Recepción" titulo="Ingreso al gimnasio" />
      <p className="text-ink-2">Pronto vas a poder registrar el ingreso de cada socio acá.</p>
    </>
  );
}
