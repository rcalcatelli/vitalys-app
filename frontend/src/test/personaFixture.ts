import type { Persona } from "../types/persona";

export function unaPersona(overrides: Partial<Persona> = {}): Persona {
  return {
    id: 1,
    usuarioId: 11,
    email: "juan.garcia@mail.com",
    nombre: "Juan",
    apellido: "García",
    dni: "38100002",
    telefono: "11-2002-0002",
    fechaNacimiento: "1990-07-22",
    estado: "ACTIVO",
    esSocioGym: true,
    fechaInicioMembresia: "2026-01-01",
    fechaAlta: "2023-05-15",
    fechaBaja: null,
    ...overrides,
  };
}
