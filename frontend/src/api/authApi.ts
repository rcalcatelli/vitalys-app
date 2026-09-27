import { http } from "./http";
import type { LoginRequest, LoginResponse, RegistroRequest, Usuario } from "../types/auth";

/** POST /api/auth/login — público, sin token. `identificador` acepta DNI o email. */
export function login(credentials: LoginRequest): Promise<LoginResponse> {
  return http.post<LoginResponse>("/api/auth/login", credentials, false);
}

/**
 * POST /api/auth/registro — público, sin token. El body NUNCA incluye `rol`
 * (RF-01 / CA-01-7): el rol siempre lo asigna el backend como SOCIO_PACIENTE.
 */
export function registro(data: RegistroRequest): Promise<LoginResponse> {
  return http.post<LoginResponse>("/api/auth/registro", data, false);
}

/** GET /api/auth/me — protegido por JWT. */
export function me(): Promise<Usuario> {
  return http.get<Usuario>("/api/auth/me", true);
}
