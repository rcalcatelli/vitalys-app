/** Franja semanal tal como la devuelve el backend. Las horas llegan como `HH:mm` o `HH:mm:ss`. */
export interface FranjaApi {
  id: number;
  /** 1 = lunes … 7 = domingo. */
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
}

/** Franja que viaja en el batch (PUT/POST impacto): sin id, horas `HH:mm`. */
export interface FranjaInput {
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
}

/** Fila del editor: `clave` es solo local (no existe en el backend) para identificar la fila en el borrador. */
export interface FranjaEditable extends FranjaInput {
  clave: string;
}
