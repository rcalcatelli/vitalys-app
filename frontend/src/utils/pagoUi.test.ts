import { describe, expect, it } from "vitest";
import {
  clasesEstadoPeriodo,
  etiquetaEstadoPeriodo,
  etiquetaMedio,
  etiquetaPeriodo,
  fechaDMA,
  fechaInstanteDMA,
  formatearMonto,
  parsearMonto,
  sumarMeses,
} from "./pagoUi";

describe("pagoUi", () => {
  it("etiqueta el período y la fecha", () => {
    expect(etiquetaPeriodo("2026-10-01")).toBe("Octubre 2026");
    expect(etiquetaPeriodo("2027-01-01")).toBe("Enero 2027");
    expect(fechaDMA("2026-10-05")).toBe("05/10/2026");
  });

  it("convierte un instante a fecha de Buenos Aires, no UTC", () => {
    // 01:30 UTC del 6/10 es 22:30 del 5/10 en Buenos Aires.
    expect(fechaInstanteDMA("2026-10-06T01:30:00Z")).toBe("05/10/2026");
  });

  it("formatea montos en pesos argentinos", () => {
    expect(formatearMonto(15000)).toBe("$ 15.000,00");
    expect(formatearMonto(8000.5)).toBe("$ 8.000,50");
  });

  it("suma meses cruzando el año", () => {
    expect(sumarMeses("2026-11-01", 1)).toBe("2026-12-01");
    expect(sumarMeses("2026-11-01", 2)).toBe("2027-01-01");
    expect(sumarMeses("2026-01-01", -1)).toBe("2025-12-01");
  });

  it.each([
    ["15000", 15000],
    [" 15000,50 ", 15000.5],
    ["8000.5", 8000.5],
    ["", null],
    ["abc", null],
    ["-5", null],
    ["10.123", null],
  ])("parsea el monto %j", (texto, esperado) => {
    expect(parsearMonto(texto)).toBe(esperado);
  });

  it("traduce medios y estados de período", () => {
    expect(etiquetaMedio("DEBITO")).toBe("Débito");
    expect(etiquetaEstadoPeriodo("PENDIENTE")).toBe("Pendiente");
    expect(clasesEstadoPeriodo("PAGADO")).toContain("ok");
    expect(clasesEstadoPeriodo("IMPAGO")).toContain("bad");
    expect(clasesEstadoPeriodo("PENDIENTE")).toContain("warn");
  });
});
