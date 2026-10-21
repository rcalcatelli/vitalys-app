import { describe, expect, it } from "vitest";
import type { FranjaEditable } from "../types/disponibilidad";
import {
  aEditables,
  aHora,
  aMinutos,
  diasVisibles,
  mismoConjunto,
  nombreDia,
  nombreDiaCorto,
  normalizarHora,
  opcionesDeHora,
  sinClaves,
  validarFranjas,
} from "./disponibilidad";

const fila = (
  clave: string,
  diaSemana: number,
  horaInicio: string,
  horaFin: string,
): FranjaEditable => ({
  clave,
  diaSemana,
  horaInicio,
  horaFin,
});

describe("disponibilidad utils", () => {
  it("convierte entre minutos y HH:mm", () => {
    expect(aMinutos("09:30")).toBe(570);
    expect(aHora(570)).toBe("09:30");
    expect(aHora(420)).toBe("07:00");
  });

  it("ofrece horas cada 30 min de 07:00 a 21:00", () => {
    const horas = opcionesDeHora();
    expect(horas[0]).toBe("07:00");
    expect(horas[1]).toBe("07:30");
    expect(horas.at(-1)).toBe("21:00");
    expect(horas).toHaveLength(29);
  });

  it("nombra los días con 7 = domingo", () => {
    expect(nombreDia(1)).toBe("Lunes");
    expect(nombreDia(7)).toBe("Domingo");
    expect(nombreDiaCorto(3)).toBe("Mié");
  });

  it("normaliza las horas del backend y arma filas editables", () => {
    expect(normalizarHora("09:00:00")).toBe("09:00");
    expect(
      aEditables([{ id: 4, diaSemana: 2, horaInicio: "09:00:00", horaFin: "12:00:00" }]),
    ).toEqual([{ clave: "f4", diaSemana: 2, horaInicio: "09:00", horaFin: "12:00" }]);
    expect(sinClaves([fila("x", 1, "09:00", "10:00")])).toEqual([
      { diaSemana: 1, horaInicio: "09:00", horaFin: "10:00" },
    ]);
  });

  it("valida fin posterior al inicio", () => {
    expect(validarFranjas([fila("a", 1, "10:00", "10:00")])).toEqual({
      a: "El horario de fin tiene que ser posterior al de inicio.",
    });
  });

  it("detecta solapamientos del mismo día y no los de días distintos ni contiguos", () => {
    const errores = validarFranjas([
      fila("a", 1, "09:00", "12:00"),
      fila("b", 1, "11:00", "13:00"),
      fila("c", 2, "09:00", "12:00"),
      fila("d", 1, "13:00", "15:00"),
    ]);
    expect(errores.a).toBe("Se superpone con Lunes 11:00–13:00.");
    expect(errores.b).toBe("Se superpone con Lunes 09:00–12:00.");
    expect(errores.c).toBeUndefined();
    expect(errores.d).toBeUndefined();
  });

  it("compara conjuntos sin importar orden ni claves", () => {
    const a = [fila("a", 1, "09:00", "12:00"), fila("b", 2, "09:00", "12:00")];
    const b = [fila("z", 2, "09:00", "12:00"), fila("y", 1, "09:00", "12:00")];
    expect(mismoConjunto(a, b)).toBe(true);
    expect(mismoConjunto(a, [fila("a", 1, "09:00", "13:00"), fila("b", 2, "09:00", "12:00")])).toBe(
      false,
    );
    expect(mismoConjunto(a, [])).toBe(false);
    expect(
      mismoConjunto(
        [fila("a", 1, "09:00", "10:00"), fila("b", 1, "08:00", "09:00")],
        [fila("a", 1, "08:00", "09:00"), fila("b", 1, "09:00", "10:00")],
      ),
    ).toBe(true);
    expect(
      mismoConjunto(
        [fila("a", 1, "09:00", "10:00"), fila("b", 1, "09:00", "11:00")],
        [fila("a", 1, "09:00", "11:00"), fila("b", 1, "09:00", "10:00")],
      ),
    ).toBe(true);
  });

  it("muestra el domingo en la grilla solo si hay una franja ese día", () => {
    expect(diasVisibles([])).toEqual([1, 2, 3, 4, 5, 6]);
    expect(diasVisibles([fila("a", 7, "09:00", "10:00")])).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });
});
