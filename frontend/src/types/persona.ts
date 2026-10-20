// Contrato de /api/personas (Módulo 2). El estado es unión de literales por la
// misma razón que RolUsuario: `erasableSyntaxOnly` no admite enums de TS.
export type EstadoPersona = "ACTIVO" | "INACTIVO";

export interface Persona {
  id: number;
  usuarioId: number;
  email: string;
  nombre: string;
  apellido: string;
  dni: string;
  telefono: string | null;
  fechaNacimiento: string | null;
  estado: EstadoPersona;
  esSocioGym: boolean;
  fechaInicioMembresia: string | null;
  fechaAlta: string;
  fechaBaja: string | null;
}

/** Datos editables (PUT /api/personas/{id}). Las fechas viajan como `YYYY-MM-DD`. */
export interface PersonaDatos {
  nombre: string;
  apellido: string;
  dni: string;
  telefono: string | null;
  fechaNacimiento: string | null;
  esSocioGym: boolean;
  fechaInicioMembresia: string | null;
}

/** Alta presencial (POST /api/personas, RF-05): credenciales nuevas + datos. */
export interface PersonaAlta {
  email: string;
  contrasena: string;
  datos: PersonaDatos;
}

/** Filtros de W-05. `soloGym` es independiente del estado. */
export type FiltroPersonas = "TODOS" | "ACTIVOS" | "INACTIVOS" | "GYM";
