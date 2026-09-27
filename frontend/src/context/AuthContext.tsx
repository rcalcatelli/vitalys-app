import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import * as authApi from "../api/authApi";
import { clearToken, getToken, setToken as persistToken } from "../api/http";
import type { RolUsuario, Usuario } from "../types/auth";

interface AuthContextValue {
  usuario: Usuario | null;
  rol: RolUsuario | null;
  token: string | null;
  isAuthenticated: boolean;
  /** true mientras se resuelve la sesión existente (token en localStorage) contra /api/auth/me. */
  isLoading: boolean;
  /** `identificador` acepta DNI o email (W-01) — el backend resuelve cuál es. */
  login: (identificador: string, contrasena: string) => Promise<Usuario>;
  /**
   * POST /api/auth/registro (RF-01/CA-01-5, W-06): el backend crea la cuenta con rol
   * forzado a SOCIO_PACIENTE y devuelve un JWT ya utilizable, así que el registro deja
   * a la persona logueada de inmediato — mismo mecanismo de sesión que `login`.
   */
  registrarse: (email: string, contrasena: string) => Promise<Usuario>;
  /**
   * Logout client-side (Decisión 9 / RNF-10): no existe endpoint de invalidación
   * server-side, así que solo se descarta el token y se limpia el estado. El
   * redirect a /login ocurre porque RoleGuard, al ver isAuthenticated=false,
   * redirige — no hay navegación acoplada acá para no atar el contexto al router.
   */
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [token, setTokenState] = useState<string | null>(() => getToken());
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(() => getToken() !== null);

  // Solo se ejecuta al montar (deps vacío, a propósito): resuelve una sesión existente
  // en localStorage (p.ej. tras un refresh) contra /api/auth/me. Si el token es
  // inválido/expirado, se descarta.
  //
  // Deliberadamente NO depende de `token`: login()/registrarse() ya resuelven /me por su
  // cuenta después de persistir el token nuevo (`iniciarSesionConToken`), así que si este
  // efecto además reaccionara a ese cambio de `token` duplicaría la llamada a /me — y si
  // esa segunda llamada fallara (p.ej. una respuesta lenta/errónea), borraría una sesión
  // que se acababa de crear con éxito.
  useEffect(() => {
    const tokenExistente = getToken();
    if (!tokenExistente) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    authApi
      .me()
      .then((data) => {
        if (!cancelled) {
          setUsuario(data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          clearToken();
          setTokenState(null);
          setUsuario(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Común a login y registrarse: ambos terminan con un JWT nuevo que hay que persistir
  // y resolver contra /api/auth/me para poblar el usuario (evita duplicar el flujo).
  async function iniciarSesionConToken(token: string): Promise<Usuario> {
    persistToken(token);
    setTokenState(token);
    const usuarioAutenticado = await authApi.me();
    setUsuario(usuarioAutenticado);
    return usuarioAutenticado;
  }

  async function login(identificador: string, contrasena: string): Promise<Usuario> {
    const response = await authApi.login({ identificador, contrasena });
    return iniciarSesionConToken(response.token);
  }

  async function registrarse(email: string, contrasena: string): Promise<Usuario> {
    const response = await authApi.registro({ email, contrasena });
    return iniciarSesionConToken(response.token);
  }

  function logout(): void {
    clearToken();
    setTokenState(null);
    setUsuario(null);
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      usuario,
      rol: usuario?.rol ?? null,
      token,
      isAuthenticated: usuario !== null,
      isLoading,
      login,
      registrarse,
      logout,
    }),
    [usuario, token, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de un <AuthProvider>");
  }
  return context;
}
