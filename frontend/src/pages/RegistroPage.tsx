import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError } from "../api/http";
import { AuthSplitLayout } from "../components/templates/AuthSplitLayout";
import { RegistroForm } from "../components/organisms/RegistroForm";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../hooks/useTheme";
import { homePathForRol } from "../router/roleHome";

/**
 * W-06 — Registro, calcado del diseño real (`docs/02-diseno/design-system/Vitalys.dc.html`,
 * estado `auth === 'register'`): mismo panel partido que el login (W-01), con
 * su propio toggle de tema. Sin selector de rol: el rol siempre lo fuerza el
 * backend a SOCIO_PACIENTE (RF-01/CA-01-7), así que el body nunca incluye `rol`
 * (eso ya lo garantiza `RegistroForm`, que solo expone `onSubmit(email, contrasena)`).
 * Contenedor delgado: maneja estado/efectos/navegación/tema y compone
 * `AuthSplitLayout` + `RegistroForm` (presentacionales).
 */
export function RegistroPage() {
  const { registrarse } = useAuth();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(email: string, contrasena: string): Promise<void> {
    setError(null);
    setIsSubmitting(true);

    try {
      const usuario = await registrarse(email, contrasena);
      navigate(homePathForRol(usuario.rol), { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError("El email ya está registrado");
      } else if (err instanceof ApiError && err.status === 400) {
        setError(
          "Revisá el email y la contraseña: debe ser un email válido y la contraseña tener al menos 8 caracteres.",
        );
      } else {
        setError("No se pudo crear la cuenta. Intentá de nuevo.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthSplitLayout theme={theme} onToggleTheme={toggleTheme}>
      <RegistroForm
        onSubmit={handleSubmit}
        onGoToLogin={() => navigate("/login")}
        error={error}
        cargando={isSubmitting}
      />
    </AuthSplitLayout>
  );
}
