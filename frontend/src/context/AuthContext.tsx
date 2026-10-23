import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import * as authApi from "../api/authApi";
import {
  clearToken,
  clearTokenOperarComo,
  getToken,
  getTokenAdmin,
  onOperarComoVencido,
  setToken as persistToken,
  setTokenOperarComo,
} from "../api/http";
import * as operarComoApi from "../api/operarComoApi";
import type { RolUsuario, Usuario } from "../types/auth";
import { ToastContext } from "./ToastContext";

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
  /**
   * "Operar como" (RF-39): pide la credencial para `personaId`, la guarda en sessionStorage (gana
   * sobre el token del ADMIN) y pasa a la sesión del socio. Devuelve el socio; navegar a su home
   * lo hace quien llama.
   */
  operarComo: (personaId: number) => Promise<Usuario>;
  /**
   * Termina "Operar como": avisa al servidor (queda auditado y deja de aceptar la credencial),
   * descarta la credencial y vuelve a la sesión del ADMIN sin nuevo login. `false` si no quedó
   * sesión de ADMIN que recuperar (el guard manda a /login).
   */
  volverARecepcion: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [token, setTokenState] = useState<string | null>(() => getToken());
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(() => getToken() !== null);
  const mostrarToast = useContext(ToastContext)?.mostrar;
  // Siempre apuntan a lo último: el aviso de vencimiento corre fuera del render.
  const usuarioRef = useRef<Usuario | null>(null);
  usuarioRef.current = usuario;
  const mostrarRef = useRef(mostrarToast);
  mostrarRef.current = mostrarToast;
  const restauracion = useRef<Promise<void> | null>(null);

  // La credencial de "Operar como" vence (30 min), el socio puede darse de baja o la sesión se
  // puede terminar en otra pestaña: cualquier 401 hecho con ella descarta la credencial y vuelve
  // a la sesión del ADMIN, que sigue vigente en localStorage.
  useEffect(
    () =>
      onOperarComoVencido(() => {
        if (restauracion.current) return;
        const nombre = [usuarioRef.current?.nombre, usuarioRef.current?.apellido]
          .filter(Boolean)
          .join(" ");
        restauracion.current = restaurarSesionAdmin()
          .then((restaurada) => {
            if (restaurada) {
              mostrarRef.current?.(
                nombre ? `La sesión como ${nombre} venció` : "La sesión de Operar como venció",
              );
            }
          })
          .finally(() => {
            restauracion.current = null;
          });
      }),
    [],
  );

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
      .catch(async () => {
        // Un 401 de la credencial de "Operar como" ya disparó la vuelta a la sesión del ADMIN:
        // se espera a que termine en vez de dejar al usuario sin sesión.
        if (restauracion.current) {
          await restauracion.current;
          return;
        }
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
    // Un login nuevo reemplaza cualquier "Operar como" que haya quedado en la pestaña.
    clearTokenOperarComo();
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

  /** Descarta la credencial de "Operar como" y recupera al ADMIN. `false` si no había sesión que recuperar. */
  async function restaurarSesionAdmin(): Promise<boolean> {
    clearTokenOperarComo();
    const tokenAdmin = getTokenAdmin();
    if (!tokenAdmin) {
      setTokenState(null);
      setUsuario(null);
      return false;
    }
    setTokenState(tokenAdmin);
    try {
      setUsuario(await authApi.me());
      return true;
    } catch {
      clearToken();
      setTokenState(null);
      setUsuario(null);
      return false;
    }
  }

  async function operarComo(personaId: number): Promise<Usuario> {
    const credencial = await operarComoApi.iniciarOperarComo(personaId);
    setTokenOperarComo(credencial.token);
    setTokenState(credencial.token);
    try {
      const socio = await authApi.me();
      setUsuario(socio);
      return socio;
    } catch (err) {
      clearTokenOperarComo();
      setTokenState(getTokenAdmin());
      throw err;
    }
  }

  async function volverARecepcion(): Promise<boolean> {
    try {
      await operarComoApi.terminarOperarComo();
    } catch {
      // Si el aviso no llegó, la credencial igual se descarta acá y vence sola a los 30 minutos.
    }
    return restaurarSesionAdmin();
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
      operarComo,
      volverARecepcion,
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
