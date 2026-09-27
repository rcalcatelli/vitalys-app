import { Button } from "../components/atoms/Button";
import { useAuth } from "../context/AuthContext";

interface PlaceholderHomePageProps {
  title: string;
}

/**
 * Placeholder de la home de cada rol, únicamente para poder ejercer el flujo
 * completo login → redirect por rol → RoleGuard (T2-6/T2-7). Las pantallas reales
 * de Personas/Profesionales/Turnos/Pagos/Notificaciones están fuera de alcance de
 * esta change (Track B) y se construyen en sprints posteriores.
 */
export function PlaceholderHomePage({ title }: PlaceholderHomePageProps) {
  const { usuario, logout } = useAuth();

  return (
    // Mobile first: ancho completo con padding chico en mobile, recién desde
    // `sm:` se limita el ancho y se centra (mismo criterio que AuthLayout).
    <main className="w-full px-4 py-8 text-center sm:mx-auto sm:my-16 sm:max-w-md sm:p-6">
      <h1 className="font-heading text-2xl font-semibold text-ink sm:text-4xl">{title}</h1>
      <p className="text-ink">
        Sesión iniciada como <strong>{usuario?.email}</strong> ({usuario?.rol}).
      </p>
      <p className="text-sm text-ink-3">
        Esta pantalla es un placeholder de ruta protegida. Su implementación real está fuera del
        alcance de este batch.
      </p>
      <Button type="button" className="mt-4" onClick={logout}>
        Cerrar sesión
      </Button>
    </main>
  );
}
