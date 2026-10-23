import type { Especialidad } from "./profesional";

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
  /** Deuda de gimnasio (RN-01); `null` si no es socio del gimnasio o no tiene membresía. */
  cuota: CuotaPersona | null;
  /** Especialidades en las que tuvo turnos de consultorio (sin cancelados). */
  especialidades: Especialidad[];
  /** Tiene un usuario SOCIO_PACIENTE activo: es lo que habilita "Operar como". */
  tieneUsuarioSocio: boolean;
}

export interface CuotaPersona {
  periodosImpagos: number;
  umbral: number;
  suspendido: boolean;
  /** `yyyy-MM-dd`, o `null` si no tiene excepción vigente. */
  excepcionHasta: string | null;
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

/** Vínculo con un usuario ya registrado (POST /api/personas/vincular, RF-31): sin contraseña. */
export interface PersonaVinculo {
  email: string;
  datos: PersonaDatos;
}

/**
 * Filtros de Personas. `GYM` y `CON_DEUDA` se resuelven en el servidor (`soloGym`, `conDeuda`);
 * `CONSULTORIO` se aplica sobre las especialidades que ya trae cada persona.
 */
export type FiltroPersonas = "TODOS" | "GYM" | "CONSULTORIO" | "CON_DEUDA";
