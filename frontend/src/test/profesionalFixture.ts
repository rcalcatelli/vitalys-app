import type { Profesional } from "../types/profesional";

export function unProfesional(overrides: Partial<Profesional> = {}): Profesional {
  return {
    id: 1,
    usuarioId: 21,
    email: "valentina.mendez@vitalys.com",
    nombre: "Valentina",
    apellido: "Méndez",
    especialidad: "NUTRICION",
    duracionTurnoMinutos: 30,
    activo: true,
    ...overrides,
  };
}
