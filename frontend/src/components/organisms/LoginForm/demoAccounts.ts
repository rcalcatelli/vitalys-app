export interface DemoAccount {
  id: string;
  initials: string;
  name: string;
  description: string;
  /** Color del avatar, como en el diseño: gym para recepción, bad para el socio suspendido. */
  tono: "clin" | "gym" | "bad";
  /** DNI o email — lo que acepta `POST /api/auth/login` como `identificador`. */
  identificador: string;
  contrasena: string;
}

/**
 * Cuentas de demostración (W-01). Salen de `db/dml/seed.sql` — NO son
 * inventadas: cada `identificador`/`contrasena` corresponde a un usuario real
 * del seed (contraseña única para todos: `Admin1234!`, ver seed).
 *
 * Se muestran 5 cuentas, en el mismo orden y con el mismo copy que el diseño, que cubren
 * distintos roles y casos de negocio:
 * - Admin y Profesional (Nutrición) se identifican por EMAIL porque el seed no
 *   les asigna DNI (solo las `personas` —socios/pacientes— tienen `dni`).
 * - Los 3 socios/pacientes se identifican por DNI a propósito, para mostrar
 *   que el campo "DNI o email" realmente acepta ambos formatos.
 * - Juan García (suspendido por períodos impagos, RN-01) y Carlos Soto (paciente sin gym,
 *   `es_socio_gym=false`) muestran los dos casos de negocio no triviales del dominio.
 * - La cuenta de recepción es la ADMIN con ficha de persona "Laura Benítez" (seed).
 */
export const demoAccounts: DemoAccount[] = [
  {
    id: "socio-al-dia",
    initials: "MP",
    name: "María Pérez",
    description: "Socia y paciente · al día",
    tono: "clin",
    identificador: "38100001",
    contrasena: "Admin1234!",
  },
  {
    id: "socio-moroso",
    initials: "JG",
    name: "Juan García",
    description: "Socio · 6 períodos impagos · con excepción",
    tono: "bad",
    identificador: "38100002",
    contrasena: "Admin1234!",
  },
  {
    id: "paciente-sin-gym",
    initials: "CS",
    name: "Carlos Soto",
    description: "Solo paciente de Psicología",
    tono: "clin",
    identificador: "38100004",
    contrasena: "Admin1234!",
  },
  {
    id: "profesional-nutricion",
    initials: "VM",
    name: "Lic. Valentina Méndez",
    description: "Profesional · Nutrición",
    tono: "clin",
    identificador: "nutricion@vitalys.com",
    contrasena: "Admin1234!",
  },
  {
    id: "admin",
    initials: "LB",
    name: "Laura Benítez",
    description: "Recepción · administración",
    tono: "gym",
    identificador: "admin@vitalys.com",
    contrasena: "Admin1234!",
  },
];
