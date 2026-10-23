import { describe, expect, it } from "vitest";
import {
  abreviaturaDia,
  diasEntre,
  fechaCorta,
  fechaDiaMes,
  fechaLargaDe,
  fechaRelativa,
  nombreDia,
  nombreMes,
  numeroDia,
} from "./diasUi";

describe("diasUi", () => {
  it("abrevia el día de la semana (lunes a domingo)", () => {
    expect(abreviaturaDia("2026-10-26")).toBe("Lun");
    expect(abreviaturaDia("2026-11-01")).toBe("Dom");
  });

  it("devuelve el número de día y la fecha corta", () => {
    expect(numeroDia("2026-10-05")).toBe(5);
    expect(fechaCorta("2026-10-05")).toBe("05/10");
  });

  it("arma la fecha larga en español", () => {
    expect(fechaLargaDe("2026-10-26")).toBe("Lunes 26 de octubre");
  });

  it("arma la fecha corta de las tablas y los nombres largos", () => {
    expect(fechaDiaMes("2026-09-30")).toBe("Mié 30 sep");
    expect(nombreDia("2026-09-30")).toBe("Miércoles");
    expect(nombreMes("2026-09-30")).toBe("septiembre");
  });

  it("cuenta días entre fechas y las expresa relativas a hoy", () => {
    expect(diasEntre("2026-09-29", "2026-10-02")).toBe(3);
    expect(diasEntre("2026-09-29", "2026-09-28")).toBe(-1);
    expect(fechaRelativa("2026-09-29", "2026-09-29")).toBe("hoy");
    expect(fechaRelativa("2026-09-30", "2026-09-29")).toBe("mañana");
    expect(fechaRelativa("2026-09-28", "2026-09-29")).toBe("ayer");
    expect(fechaRelativa("2026-10-02", "2026-09-29")).toBe("en 3 días");
    expect(fechaRelativa("2026-09-25", "2026-09-29")).toBe("hace 4 días");
  });
});
