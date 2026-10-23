import { http } from "./http";
import { normalizarEstadoCuenta } from "./normalizar";
import type { EstadoCuenta, PagoRegistrado, RegistrarPago } from "../types/pago";

/** GET /api/pagos/mi-estado-cuenta: estado de cuenta del socio autenticado (422 si no tiene ficha). */
export function miEstadoCuenta(): Promise<EstadoCuenta> {
  return http.get<EstadoCuenta>("/api/pagos/mi-estado-cuenta").then(normalizarEstadoCuenta);
}

/** GET /api/pagos/persona/{id}/estado-cuenta: ADMIN, cualquier persona. */
export function estadoCuentaDe(personaId: number): Promise<EstadoCuenta> {
  return http
    .get<EstadoCuenta>(`/api/pagos/persona/${personaId}/estado-cuenta`)
    .then(normalizarEstadoCuenta);
}

/** POST /api/pagos: registra una cuota mensual o una sesión de consultorio (ADMIN). */
export function registrarPago(pago: RegistrarPago): Promise<PagoRegistrado> {
  return http.post<PagoRegistrado>("/api/pagos", pago);
}
