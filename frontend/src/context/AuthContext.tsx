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
  login: (email: string, contrasena: string) => Promise<Usuario>;
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

  // Al montar (o si el token cambia), si hay token guardado se resuelve la sesión
  // contra /api/auth/me. Si el token es inválido/expirado, se descarta.
  useEffect(() => {
    if (!token) {
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
  }, [token]);

  async function login(email: string, contrasena: string): Promise<Usuario> {
    const response = await authApi.login({ email, contrasena });
    persistToken(response.token);
    setTokenState(response.token);
    const usuarioAutenticado = await authApi.me();
    setUsuario(usuarioAutenticado);
    return usuarioAutenticado;
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
