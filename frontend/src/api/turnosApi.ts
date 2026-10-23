import { http } from "./http";
import { normalizarProximaAgenda, normalizarTurno, normalizarTurnos } from "./normalizar";
import type {
  EstadoGym,
  FranjaGym,
  ProximaAgenda,
  SlotConsultorio,
  TipoTurno,
  Turno,
  TurnoAgenda,
} from "../types/turno";

/** GET /api/turnos/gym/cupo?fecha: grilla del día. Vacía si es domingo o feriado. */
export function cupoGym(fecha: string): Promise<FranjaGym[]> {
  return http.get<FranjaGym[]>(`/api/turnos/gym/cupo?fecha=${fecha}`);
}

/** GET /api/turnos/gym/estado: membresía y morosidad del socio autenticado. */
export function estadoGym(): Promise<EstadoGym> {
  return http.get<EstadoGym>("/api/turnos/gym/estado");
}

/** POST /api/turnos/gym: la franja dura 60 min, solo se envía el inicio. */
export function reservarGym(inicio: string): Promise<Turno> {
  return http.post<Turno>("/api/turnos/gym", { inicio }).then(normalizarTurno);
}

/** GET /api/turnos/disponibles: slots del día de un profesional. */
export function slotsDisponibles(profesionalId: number, fecha: string): Promise<SlotConsultorio[]> {
  return http.get<SlotConsultorio[]>(
    `/api/turnos/disponibles?profesionalId=${profesionalId}&fecha=${fecha}`,
  );
}

/** GET /api/turnos/consultorio/proxima-agenda: próximo día con turnos libres de cada profesional activo. */
export function proximaAgenda(): Promise<ProximaAgenda[]> {
  return http
    .get<ProximaAgenda[]>("/api/turnos/consultorio/proxima-agenda")
    .then(normalizarProximaAgenda);
}

/** POST /api/turnos: reserva un slot de consultorio. */
export function reservarConsultorio(profesionalId: number, inicio: string): Promise<Turno> {
  return http.post<Turno>("/api/turnos", { profesionalId, inicio }).then(normalizarTurno);
}

/** GET /api/turnos/mis-turnos: turnos del socio autenticado. */
export function misTurnos(): Promise<Turno[]> {
  return http.get<Turno[]>("/api/turnos/mis-turnos").then(normalizarTurnos);
}

/** PATCH /api/turnos/{id}/cancelar: el motivo es obligatorio (máx. 500). */
export function cancelarTurno(id: number, motivo: string): Promise<Turno> {
  return http.patch<Turno>(`/api/turnos/${id}/cancelar`, { motivo }).then(normalizarTurno);
}

/** GET /api/turnos/mi-agenda: agenda del profesional (por defecto, hoy a +7 días), con DNI. */
export function miAgenda(desde?: string, hasta?: string): Promise<TurnoAgenda[]> {
  const params = new URLSearchParams();
  if (desde) params.set("desde", desde);
  if (hasta) params.set("hasta", hasta);
  const query = params.toString();
  return http.get<TurnoAgenda[]>(`/api/turnos/mi-agenda${query ? `?${query}` : ""}`);
}

/** PATCH /api/turnos/{id}/completado: el profesional marca "Atendido". */
export function marcarCompletado(id: number): Promise<Turno> {
  return http.patch<Turno>(`/api/turnos/${id}/completado`).then(normalizarTurno);
}

/** PATCH /api/turnos/{id}/ausente: solo con el turno ya iniciado. */
export function marcarAusente(id: number): Promise<Turno> {
  return http.patch<Turno>(`/api/turnos/${id}/ausente`).then(normalizarTurno);
}

/** GET /api/turnos?tipo&personaId&fecha: listado filtrado (ADMIN); trae el DNI de cada persona. */
export function listarTurnos(filtro: {
  personaId?: number;
  tipo?: TipoTurno;
  /** `YYYY-MM-DD` (día de BA en el que empieza el turno). */
  fecha?: string;
}): Promise<Turno[]> {
  const params = new URLSearchParams();
  if (filtro.personaId !== undefined) params.set("personaId", String(filtro.personaId));
  if (filtro.tipo) params.set("tipo", filtro.tipo);
  if (filtro.fecha) params.set("fecha", filtro.fecha);
  const query = params.toString();
  return http.get<Turno[]>(`/api/turnos${query ? `?${query}` : ""}`).then(normalizarTurnos);
}
