/**
 * Doble de `notificacionesApi` para las pantallas que montan el AdminNav: el menú consulta las
 * notificaciones fallidas por su cuenta y sin esto dispararía un fetch real. Función plana (no
 * `vi.fn`) para que `vi.restoreAllMocks()` del setup no le quite la implementación.
 *
 * Uso: `vi.mock("../api/notificacionesApi", () => notificacionesApiVacia);`
 */
export const notificacionesApiVacia = {
  listarFallidas: () => Promise.resolve([]),
};
