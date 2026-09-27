// Cliente HTTP mínimo: adjunta el JWT desde localStorage a cada request autenticada.
// No hay endpoint de logout server-side (Decisión 9 / RNF-10): el token se descarta
// solo en el cliente.
const TOKEN_KEY = "vitalys_token";

// Base URL configurable por entorno (Vite env var). Nunca hardcodear una URL de
// despliegue real ni un secreto: en desarrollo, si no está seteada, se usa "" y las
// requests son relativas (útil con un proxy de dev). En producción DEBE setearse
// VITE_API_URL en el entorno de build de Vercel.
const API_BASE_URL: string = import.meta.env.VITE_API_URL ?? "";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
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
    let message = `Error ${response.status}`;
    try {
      const data = (await response.json()) as ErrorResponseBody;
      if (data.message) {
        message = data.message;
      }
    } catch {
      // Body sin JSON (o vacío): se conserva el mensaje genérico.
    }
    throw new ApiError(response.status, message);
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
};
