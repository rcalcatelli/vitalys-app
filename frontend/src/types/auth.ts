// Tipos del dominio de autenticación (Sprint 2 — auth-jwt).
// El rol se modela como unión de literales (NO como TS enum): tsconfig.app.json tiene
// `erasableSyntaxOnly: true`, y los enums regulares de TypeScript no son sintaxis erasable.
export type RolUsuario = "SOCIO_PACIENTE" | "PROFESIONAL" | "ADMIN";

export interface Usuario {
  id: number;
  email: string;
  rol: RolUsuario;
}

export interface LoginRequest {
  email: string;
  contrasena: string;
}

export interface LoginResponse {
  token: string;
}

// El registro público NUNCA acepta `rol` en el body (RF-01 / CA-01-7): el backend
// responde 400 si la clave está presente. Este tipo lo refleja a nivel de contrato.
export interface RegistroRequest {
  email: string;
  contrasena: string;
}
