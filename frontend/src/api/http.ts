// Cliente HTTP mínimo: adjunta el JWT desde localStorage a cada request autenticada.
// No hay endpoint de logout server-side (Decisión 9 / RNF-10): el token se descarta
// solo en el cliente.
const TOKEN_KEY = "vitalys_token";
// Credencial de "Operar como" (RF-39): vive en sessionStorage, así queda atada a la pestaña y
// sobrevive a una recarga, pero otras pestañas siguen con la sesión del ADMIN. Si existe, gana
// sobre el token del ADMIN en localStorage.
const TOKEN_OPERAR_COMO_KEY = "vitalys_token_operar_como";

// Base URL configurable por entorno (Vite env var). Nunca hardcodear una URL de
// despliegue real ni un secreto: en desarrollo, si no está seteada, se usa "" y las
// requests son relativas (útil con un proxy de dev). En producción DEBE setearse
// VITE_API_URL en el entorno de build de Vercel.
const API_BASE_URL: string = import.meta.env.VITE_API_URL ?? "";

export function getToken(): string | null {
  return getTokenOperarComo() ?? localStorage.getItem(TOKEN_KEY);
}

/** Token de la sesión del ADMIN, ignorando una suplantación en curso. */
export function getTokenAdmin(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getTokenOperarComo(): string | null {
  return sessionStorage.getItem(TOKEN_OPERAR_COMO_KEY);
}

export function setTokenOperarComo(token: string): void {
  sessionStorage.setItem(TOKEN_OPERAR_COMO_KEY, token);
}

export function clearTokenOperarComo(): void {
  sessionStorage.removeItem(TOKEN_OPERAR_COMO_KEY);
}

type AlVencerOperarComo = () => void;
let alVencerOperarComo: AlVencerOperarComo | null = null;

/**
 * Registra quién se entera cuando una request hecha con la credencial de "Operar como" recibe un
 * 401 (venció, el socio se dio de baja, se terminó en otra pestaña): el contexto de auth la
 * descarta y vuelve a la sesión del ADMIN. Devuelve la función para desregistrar.
 */
export function onOperarComoVencido(callback: AlVencerOperarComo): () => void {
  alVencerOperarComo = callback;
  return () => {
    if (alVencerOperarComo === callback) alVencerOperarComo = null;
  };
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  clearTokenOperarComo();
}

export class ApiError extends Error {
  readonly status: number;
  /** Body JSON de la respuesta de error (si lo había): p. ej. el `impacto` de un 409 de RN-24/RN-25. */
  readonly body: unknown;

  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  /** Adjunta `Authorization: Bearer <token>` si hay token guardado. Default: true. */
  auth?: boolean;
}

interface ErrorResponseBody {
  message?: string;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, auth = true } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Solo las requests autenticadas llevan token: `auth=false` (login, registro) NUNCA envía la
  // credencial de "Operar como", que el backend rechazaría con 403.
  const suplantando = auth && getTokenOperarComo() !== null;
  if (auth) {
    const token = getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) {
    if (response.status === 401 && suplantando) alVencerOperarComo?.();
    let message = `Error ${response.status}`;
    let errorBody: unknown;
    try {
      const data = (await response.json()) as ErrorResponseBody;
      errorBody = data;
      if (data.message) {
        message = data.message;
      }
    } catch {
      // Body sin JSON (o vacío): se conserva el mensaje genérico.
    }
    throw new ApiError(response.status, message, errorBody);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const http = {
  get: <T>(path: string, auth = true): Promise<T> => request<T>(path, { method: "GET", auth }),
  post: <T>(path: string, body?: unknown, auth = true): Promise<T> =>
    request<T>(path, { method: "POST", body, auth }),
  put: <T>(path: string, body?: unknown): Promise<T> => request<T>(path, { method: "PUT", body }),
  patch: <T>(path: string, body?: unknown): Promise<T> =>
    request<T>(path, { method: "PATCH", body }),
  delete: <T>(path: string): Promise<T> => request<T>(path, { method: "DELETE" }),
};
