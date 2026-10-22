import { ApiError } from "../api/http";

/** 409 (carrera / ya tenés turno) y 422 (regla de negocio): el servidor explica qué pasó. */
export function esErrorDeRegla(err: unknown): boolean {
  return err instanceof ApiError && (err.status === 409 || err.status === 422);
}

/** Mensaje para mostrar al usuario: el del servidor si es una regla de negocio, genérico si no. */
export function mensajeDeError(err: unknown): string {
  if (err instanceof ApiError && esErrorDeRegla(err)) return err.message;
  if (err instanceof ApiError && err.status === 403) {
    return "Tu usuario no tiene permiso para esta operación.";
  }
  return "No se pudo completar la operación. Intentá de nuevo.";
}
