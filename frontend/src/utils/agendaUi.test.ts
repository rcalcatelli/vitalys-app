import { describe, expect, it } from "vitest";
import type { FranjaApi } from "../types/disponibilidad";
import { huecosLibres } from "./agendaUi";

// Lunes 26/10/2026.
const LUNES = "2026-10-26";
const franja = (diaSemana: number, horaInicio: string, horaFin: string): FranjaApi => ({
  id: 1,
  diaSemana,
  horaInicio,
  horaFin,
});

describe("huecosLibres", () => {
  it("corta la franja del día en turnos de la duración del profesional", () => {
    const huecos = huecosLibres([franja(1, "09:00:00", "10:30:00")], 30, LUNES, []);
    expect(huecos.map((h) => h.inicio)).toEqual([
      "2026-10-26T09:00:00-03:00",
      "2026-10-26T09:30:00-03:00",
      "2026-10-26T10:00:00-03:00",
    ]);
    expect(huecos[0].fin).toBe("2026-10-26T09:30:00-03:00");
  });

  it("descarta los horarios que se pisan con un turno vigente y devuelve ordenados", () => {
    const huecos = huecosLibres(
      [franja(1, "11:00", "12:00"), franja(1, "09:00", "10:00")],
      30,
      LUNES,
      [
        {
          inicio: "2026-10-26T09:30:00-03:00",
          fin: "2026-10-26T10:00:00-03:00",
          estado: "RESERVADO",
        },
      ],
    );
    expect(huecos.map((h) => h.inicio.slice(11, 16))).toEqual(["09:00", "11:00", "11:30"]);
  });

  it("un turno cancelado no ocupa lugar", () => {
    const huecos = huecosLibres([franja(1, "09:00", "09:30")], 30, LUNES, [
      {
        inicio: "2026-10-26T09:00:00-03:00",
        fin: "2026-10-26T09:30:00-03:00",
        estado: "CANCELADO_TARDE",
      },
    ]);
    expect(huecos).toHaveLength(1);
  });

  it("ignora las franjas de otros días, el último tramo incompleto y una duración inválida", () => {
    expect(huecosLibres([franja(2, "09:00", "10:00")], 30, LUNES, [])).toEqual([]);
    expect(huecosLibres([franja(1, "09:00", "09:45")], 30, LUNES, [])).toHaveLength(1);
    expect(huecosLibres([franja(1, "09:00", "10:00")], 0, LUNES, [])).toEqual([]);
  });
});
