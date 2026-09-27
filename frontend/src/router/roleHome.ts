import type { RolUsuario } from "../types/auth";

/** Home de cada rol tras un login exitoso (W-01) o cuando el RoleGuard rechaza una ruta. */
export function homePathForRol(rol: RolUsuario): string {
  switch (rol) {
    case "ADMIN":
      return "/admin/dashboard";
    case "PROFESIONAL":
      return "/profesional/agenda";
    case "SOCIO_PACIENTE":
      return "/socio/turnos";
    default:
      return "/login";
  }
}
