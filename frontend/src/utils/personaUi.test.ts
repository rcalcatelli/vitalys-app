import { describe, expect, it } from "vitest";
import { unaPersona } from "../test/personaFixture";
import { chipCuota, diaMes, inicialesDe, serviciosDe } from "./personaUi";

const cuota = (extra: object = {}) => ({
  periodosImpagos: 0,
  umbral: 6,
  suspendido: false,
  excepcionHasta: null,
  ...extra,
});

describe("chipCuota", () => {
  it.each([
    ["dada de baja", { estado: "INACTIVO" as const }, "neutral", "Dado de baja"],
    ["sin cuota de gym", { esSocioGym: false, cuota: null }, "neutral", "Sin cuota de gym"],
    ["sin membresía", { cuota: null }, "neutral", "Sin cuota de gym"],
    ["al día", { cuota: cuota() }, "ok", "Al día"],
    ["con impagos", { cuota: cuota({ periodosImpagos: 2 }) }, "warn", "2 de 6 impagos"],
    ["suspendida", { cuota: cuota({ periodosImpagos: 6, suspendido: true }) }, "bad", "Suspendido"],
    [
      "con excepción vigente",
      { cuota: cuota({ periodosImpagos: 6, excepcionHasta: "2026-10-15" }) },
      "warn",
      "Excepción hasta 15/10",
    ],
  ])("%s", (_nombre, datos, tone, label) => {
    expect(chipCuota(unaPersona(datos))).toEqual({ tone, label });
  });
});

describe("serviciosDe / inicialesDe / diaMes", () => {
  it("arma los servicios con Gimnasio primero", () => {
    expect(serviciosDe(unaPersona({ especialidades: ["NUTRICION", "KINESIOLOGIA"] }))).toEqual([
      { tone: "gym", label: "Gimnasio" },
      { tone: "clin", label: "Nutrición" },
      { tone: "clin", label: "Kinesiología" },
    ]);
    expect(serviciosDe(unaPersona({ esSocioGym: false }))).toEqual([]);
  });

  it("toma las iniciales de nombre y apellido", () => {
    expect(inicialesDe({ nombre: "María", apellido: "Pérez" })).toBe("MP");
  });

  it("formatea día y mes", () => {
    expect(diaMes("2026-10-05")).toBe("05/10");
  });
});
