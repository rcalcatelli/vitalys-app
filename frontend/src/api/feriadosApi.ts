import { http } from "./http";
import type { Feriado } from "../types/turno";

/** GET /api/feriados?anio: feriados cargados del año (el gimnasio cierra si `cierraGimnasio`). */
export function listarFeriados(anio: number): Promise<Feriado[]> {
  return http.get<Feriado[]>(`/api/feriados?anio=${anio}`);
}
