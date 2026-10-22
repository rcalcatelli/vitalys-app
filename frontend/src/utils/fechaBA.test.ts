import { describe, expect, it } from "vitest";
import {
  anioBA,
  diaSemana,
  fechaBA,
  horaBA,
  horasHasta,
  hoyBA,
  instanteBA,
  minutosHasta,
  sumarDias,
} from "./fechaBA";

describe("fechaBA", () => {
  it("convierte un instante UTC a la fecha y hora de Buenos Aires", () => {
    expect(fechaBA("2026-10-26T13:00:00Z")).toBe("2026-10-26");
    expect(horaBA("2026-10-26T13:00:00Z")).toBe("10:00");
    expect(horaBA(new Date("2026-10-26T13:05:00Z"))).toBe("10:05");
  });

  it("a medianoche BA el día cambia a las 03:00 UTC, no a las 00:00 UTC", () => {
    expect(hoyBA(new Date("2026-10-27T02:59:00Z"))).toBe("2026-10-26");
    expect(hoyBA(new Date("2026-10-27T03:00:00Z"))).toBe("2026-10-27");
    expect(horaBA("2026-10-27T03:00:00Z")).toBe("00:00");
  });

  it("el año cambia a las 03:00 UTC del 1 de enero", () => {
    expect(anioBA(new Date("2027-01-01T02:59:00Z"))).toBe(2026);
    expect(anioBA(new Date("2027-01-01T03:00:00Z"))).toBe(2027);
  });

  it("sumarDias cruza mes, año y bisiestos", () => {
    expect(sumarDias("2026-10-31", 1)).toBe("2026-11-01");
    expect(sumarDias("2026-12-31", 1)).toBe("2027-01-01");
    expect(sumarDias("2027-01-01", -1)).toBe("2026-12-31");
    expect(sumarDias("2028-02-28", 1)).toBe("2028-02-29");
  });

  it("diaSemana va de 1 (lunes) a 7 (domingo)", () => {
    expect(diaSemana("2026-10-26")).toBe(1);
    expect(diaSemana("2026-10-31")).toBe(6);
    expect(diaSemana("2026-11-01")).toBe(7);
  });

  it("instanteBA arma el ISO con offset -03:00", () => {
    expect(instanteBA("2026-10-26", "10:00")).toBe("2026-10-26T10:00:00-03:00");
    expect(new Date(instanteBA("2026-10-26", "10:00")).toISOString()).toBe(
      "2026-10-26T13:00:00.000Z",
    );
  });

  it("minutosHasta y horasHasta son negativos cuando el turno ya empezó", () => {
    const ahora = new Date("2026-10-26T13:00:00Z");
    expect(minutosHasta("2026-10-26T10:15:00-03:00", ahora)).toBe(15);
    expect(minutosHasta("2026-10-26T09:50:00-03:00", ahora)).toBe(-10);
    expect(horasHasta("2026-10-27T10:00:00-03:00", ahora)).toBe(24);
  });

  it("minutosHasta redondea hacia arriba: faltando 59 s todavía falta 1 minuto", () => {
    const ahora = new Date("2026-10-26T13:00:01Z");
    expect(minutosHasta("2026-10-26T10:01:00-03:00", ahora)).toBe(1);
    expect(minutosHasta("2026-10-26T10:00:00-03:00", new Date("2026-10-26T13:00:00Z"))).toBe(0);
  });
});
