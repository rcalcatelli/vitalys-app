// Tipos del dominio de autenticación (Sprint 2 — auth-jwt).
// El rol se modela como unión de literales (NO como TS enum): tsconfig.app.json tiene
// `erasableSyntaxOnly: true`, y los enums regulares de TypeScript no son sintaxis erasable.
export type RolUsuario = "SOCIO_PACIENTE" | "PROFESIONAL" | "ADMIN";

export interface Usuario {
  id: number;
  email: string;
  rol: RolUsuario;
}

// `identificador` acepta DNI o email (W-01 / diseño Vitalys.dc.html: "DNI o
// email"): el backend resuelve cuál de los dos es antes de validar la
// contraseña. El registro (`RegistroRequest`, más abajo) NO cambia — sigue
// siendo solo `email`.
export interface LoginRequest {
  identificador: string;
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
