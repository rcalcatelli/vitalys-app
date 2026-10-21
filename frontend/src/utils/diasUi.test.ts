import { describe, expect, it } from "vitest";
import { abreviaturaDia, fechaCorta, fechaLargaDe, numeroDia } from "./diasUi";

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
});
