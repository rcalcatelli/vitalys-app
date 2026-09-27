import { Link } from "react-router-dom";
import { AuthLayout } from "../components/templates/AuthLayout";

/**
 * Pantalla informativa para "¿Olvidaste tu contraseña?" (W-01). El backend NO
 * tiene un endpoint de recuperación de contraseña y ningún RF lo contempla
 * todavía — en vez de simular un formulario que no hace nada, esta pantalla
 * es honesta sobre el estado real: la funcionalidad no existe todavía.
 * Contenedor delgado sin estado ni llamadas a la API (no hay nada que hacer
 * acá salvo mostrar el mensaje y volver al login).
 */
export function RecuperarContrasenaPage() {
  return (
    <AuthLayout title="Recuperar contraseña">
      <p className="text-ink-2">
        Todavía no está disponible la recuperación de contraseña por acá. Va a estar habilitada más
        adelante.
      </p>
      <p className="text-ink-2">
        Mientras tanto, si no podés ingresar a tu cuenta, acercate al centro para que te ayuden a
        restablecerla.
      </p>
      <Link to="/login" className="font-medium">
        Volver a ingresar
      </Link>
    </AuthLayout>
  );
}
