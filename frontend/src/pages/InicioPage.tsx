import { PageHeader } from "../components/molecules/PageHeader";
import { useAuth } from "../context/AuthContext";

/**
 * Inicio del socio (`/socio/inicio`). Marcador de posición del shell: el contenido real (próximo
 * turno, cuota, atajos y semana) llega con el slice de pantallas del socio.
 */
export function InicioPage() {
  const { usuario } = useAuth();
  const nombre = usuario?.nombre?.split(/\s+/)[0] ?? "";

  return (
    <>
      <PageHeader titulo={nombre ? `Hola, ${nombre}` : "Inicio"} />
      <p className="text-ink-2">Pronto vas a ver acá tu próximo turno y el estado de tu cuota.</p>
    </>
  );
}
