// Contrato de /api/profesionales (Módulo 3). Mismo criterio que `persona.ts`:
// uniones de literales en vez de enums (`erasableSyntaxOnly`).
export type Especialidad = "NUTRICION" | "PSICOLOGIA" | "KINESIOLOGIA";

export interface Profesional {
  id: number;
  /** `null` si quien consulta no es ADMIN ni el propio profesional (vista pública). */
  usuarioId: number | null;
  email: string | null;
  nombre: string;
  apellido: string;
  especialidad: Especialidad;
  duracionTurnoMinutos: number;
  activo: boolean;
}

/** Datos editables (PUT /api/profesionales/{id}). */
export interface ProfesionalDatos {
  nombre: string;
  apellido: string;
  especialidad: Especialidad;
  duracionTurnoMinutos: number;
}

/** Alta (POST /api/profesionales, RF-11): credenciales nuevas + datos. */
export interface ProfesionalAlta {
  email: string;
  contrasena: string;
  datos: ProfesionalDatos;
}

/** Filtros de W-profesionales: por especialidad o solo los dados de baja. */
export type FiltroProfesionales = "TODOS" | Especialidad | "INACTIVOS";

/** Un turno futuro que se cancelaría (RN-24 / RN-25). `inicio`/`fin` son OffsetDateTime ISO. */
export interface TurnoAfectado {
  turnoId: number;
  personaId: number;
  paciente: string;
  inicio: string;
  fin: string;
}

/** Respuesta de los endpoints de impacto y `impacto` del 409 con confirmación pendiente. */
export interface Impacto {
  cantidad: number;
  turnos: TurnoAfectado[];
}
