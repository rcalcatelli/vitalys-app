import { useId, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError } from "../api/http";
import { useAuth } from "../context/AuthContext";
import { homePathForRol } from "../router/roleHome";

/** W-01 — Login. */
export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const emailId = useId();
  const passwordId = useId();

  const [email, setEmail] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const usuario = await login(email, contrasena);
      navigate(homePathForRol(usuario.rol), { replace: true });
    } catch (err) {
      // Un único mensaje genérico por seguridad (W-01): no se distingue si el
      // email no existe o la contraseña es incorrecta.
      if (err instanceof ApiError && err.status === 401) {
        setError("Email o contraseña incorrectos");
      } else {
        setError("No se pudo iniciar sesión. Intentá de nuevo.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <h1>VITALYS APP</h1>

      <form onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor={emailId}>Email</label>
          <input
            id={emailId}
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor={passwordId}>Contraseña</label>
          <div className="password-input">
            <input
              id={passwordId}
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              value={contrasena}
              onChange={(event) => setContrasena(event.target.value)}
            />
            <button
              type="button"
              className="toggle-password"
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              onClick={() => setShowPassword((prev) => !prev)}
            >
              {showPassword ? "🙈" : "👁"}
            </button>
          </div>
        </div>

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Ingresando…" : "INGRESAR"}
        </button>
      </form>

      <p>
        ¿No tenés cuenta? <Link to="/registro">Registrarse</Link>
      </p>

      {error !== null && (
        <div role="alert" className="login-error">
          ⚠ {error}
        </div>
      )}
    </main>
  );
}
