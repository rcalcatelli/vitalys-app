import { describe, expect, it } from "vitest";
import type { EstadoTurno } from "../types/turno";
import { estaCancelado, etiquetaEstado, tonoEstado } from "./estadoTurno";

describe("estadoTurno", () => {
  it.each<[EstadoTurno, string, string]>([
    ["RESERVADO", "Reservado", "clin"],
    ["COMPLETADO", "Completado", "ok"],
    ["AUSENTE", "Ausente", "bad"],
    ["CANCELADO_EN_TIEMPO", "Cancelado en término", "neu"],
    ["CANCELADO_TARDE", "Cancelado fuera de término", "warn"],
    ["CANCELADO_POR_PROFESIONAL", "Cancelado por el centro", "neu"],
  ])("%s -> %s (%s)", (estado, etiqueta, tono) => {
    expect(etiquetaEstado(estado)).toBe(etiqueta);
    expect(tonoEstado(estado)).toBe(tono);
  });

  it("el profesional ve COMPLETADO como Atendido y el resto igual", () => {
    expect(etiquetaEstado("COMPLETADO", true)).toBe("Atendido");
    expect(etiquetaEstado("AUSENTE", true)).toBe("Ausente");
  });

  it("estaCancelado reconoce las tres cancelaciones", () => {
    expect(estaCancelado("CANCELADO_TARDE")).toBe(true);
    expect(estaCancelado("CANCELADO_POR_PROFESIONAL")).toBe(true);
    expect(estaCancelado("RESERVADO")).toBe(false);
  });
});
