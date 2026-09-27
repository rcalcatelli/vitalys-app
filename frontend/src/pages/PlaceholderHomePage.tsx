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
    <main className="placeholder-page">
      <h1>{title}</h1>
      <p>
        Sesión iniciada como <strong>{usuario?.email}</strong> ({usuario?.rol}).
      </p>
      <p className="placeholder-note">
        Esta pantalla es un placeholder de ruta protegida. Su implementación real está fuera del
        alcance de este batch.
      </p>
      <button type="button" onClick={logout}>
        Cerrar sesión
      </button>
    </main>
  );
}
