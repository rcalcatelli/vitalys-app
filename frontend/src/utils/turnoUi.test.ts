import { describe, expect, it } from "vitest";
import { unProfesional } from "../test/profesionalFixture";
import {
  PROFESIONAL_NO_DISPONIBLE,
  describirTurno,
  diaCorto,
  limiteCancelacionHoras,
} from "./turnoUi";

describe("turnoUi", () => {
  it("el límite de cancelación es 2 h en gimnasio y 24 h en consultorio", () => {
    expect(limiteCancelacionHoras({ tipoTurno: "GYM" })).toBe(2);
    expect(limiteCancelacionHoras({ tipoTurno: "CONSULTORIO" })).toBe(24);
  });

  it("describe un turno de gimnasio sin profesional", () => {
    expect(describirTurno({ tipoTurno: "GYM", profesionalId: null }, [])).toEqual({
      servicio: "Gimnasio",
      quien: "",
    });
  });

  it("describe un turno de consultorio con especialidad y nombre", () => {
    expect(
      describirTurno({ tipoTurno: "CONSULTORIO", profesionalId: 1 }, [unProfesional()]),
    ).toEqual({ servicio: "Consulta de Nutrición", quien: "Lic. Valentina Méndez" });
  });

  it("si el profesional no se encuentra usa la etiqueta de respaldo", () => {
    expect(describirTurno({ tipoTurno: "CONSULTORIO", profesionalId: 99 }, [])).toEqual({
      servicio: "Consulta",
      quien: PROFESIONAL_NO_DISPONIBLE,
    });
  });

  it("formatea el día corto en Buenos Aires", () => {
    expect(diaCorto("2026-10-26T10:00:00-03:00")).toBe("Lun 26/10");
    expect(diaCorto("2026-10-27T01:30:00Z")).toBe("Lun 26/10");
  });
});
