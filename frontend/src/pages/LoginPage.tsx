import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError } from "../api/http";
import { AuthSplitLayout } from "../components/templates/AuthSplitLayout";
import { LoginForm } from "../components/organisms/LoginForm";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../hooks/useTheme";
import { homePathForRol } from "../router/roleHome";

/**
 * W-01 — Login, calcado del diseño real (`docs/02-diseno/design-system/Vitalys.dc.html`):
 * panel de marca + panel de formulario, con toggle de tema y cuentas de
 * demostración. Contenedor delgado: maneja estado/efectos/navegación/tema y
 * compone `AuthSplitLayout` + `LoginForm` (presentacionales). El form no sabe
 * que existe un backend ni un router — recibe `onSubmit`, `error` y
 * `cargando` por props; la navegación de los enlaces internos llega como
 * callbacks (`onForgotPassword`, `onGoToRegister`).
 */
export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(identificador: string, contrasena: string): Promise<void> {
    setError(null);
    setIsSubmitting(true);

    try {
      const usuario = await login(identificador, contrasena);
      navigate(homePathForRol(usuario.rol), { replace: true });
    } catch (err) {
      // Un único mensaje genérico por seguridad (W-01): no se distingue si el
      // identificador no existe o la contraseña es incorrecta.
      if (err instanceof ApiError && err.status === 401) {
        setError("DNI/email o contraseña incorrectos");
      } else {
        setError("No se pudo iniciar sesión. Intentá de nuevo.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthSplitLayout theme={theme} onToggleTheme={toggleTheme}>
      <LoginForm
        onSubmit={handleSubmit}
        onForgotPassword={() => navigate("/recuperar-contrasena")}
        onGoToRegister={() => navigate("/registro")}
        error={error}
        cargando={isSubmitting}
      />
    </AuthSplitLayout>
  );
}
