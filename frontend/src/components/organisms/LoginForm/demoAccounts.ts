export interface DemoAccount {
  id: string;
  initials: string;
  name: string;
  description: string;
  /** DNI o email — lo que acepta `POST /api/auth/login` como `identificador`. */
  identificador: string;
  contrasena: string;
}

/**
 * Cuentas de demostración (W-01). Salen de `db/dml/seed.sql` — NO son
 * inventadas: cada `identificador`/`contrasena` corresponde a un usuario real
 * del seed (contraseña única para todos: `Admin1234!`, ver seed).
 *
 * Se eligieron 5 cuentas (mismo conteo que el mockup, `hint-placeholder-count="5"`)
 * que muestran distintos roles y casos de negocio:
 * - Admin y Profesional (Nutrición) se identifican por EMAIL porque el seed no
 *   les asigna DNI (solo las `personas` —socios/pacientes— tienen `dni`).
 * - Los 3 socios/pacientes se identifican por DNI a propósito, para mostrar
 *   que el campo "DNI o email" realmente acepta ambos formatos.
 * - Juan García (moroso) y Carlos Soto (paciente sin gym) muestran los dos
 *   casos de negocio no triviales del dominio (mora > 10 días, RN-01; y
 *   `es_socio_gym=false`), no solo el "camino feliz" de María Pérez.
 */
export const demoAccounts: DemoAccount[] = [
  {
    id: "admin",
    initials: "AD",
    name: "Administración",
    description: "admin@vitalys.com · acceso total",
    identificador: "admin@vitalys.com",
    contrasena: "Admin1234!",
  },
  {
    id: "profesional-nutricion",
    initials: "VM",
    name: "Valentina Méndez",
    description: "Profesional · Nutrición",
    identificador: "nutricion@vitalys.com",
    contrasena: "Admin1234!",
  },
  {
    id: "socio-al-dia",
    initials: "MP",
    name: "María Pérez",
    description: "Socio · gimnasio y consultorios",
    identificador: "38100001",
    contrasena: "Admin1234!",
  },
  {
    id: "socio-moroso",
    initials: "JG",
    name: "Juan García",
    description: "Socio · cuota de gimnasio vencida",
    identificador: "38100002",
    contrasena: "Admin1234!",
  },
  {
    id: "paciente-sin-gym",
    initials: "CS",
    name: "Carlos Soto",
    description: "Paciente · solo consultorios",
    identificador: "38100004",
    contrasena: "Admin1234!",
  },
];
