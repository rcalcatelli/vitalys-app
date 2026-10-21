import { describe, expect, it } from "vitest";
import { etiquetaEspecialidad, fechaLarga, horaCorta, nombreProfesional } from "./formato";

describe("formato", () => {
  it("etiqueta la especialidad con tildes", () => {
    expect(etiquetaEspecialidad("NUTRICION")).toBe("Nutrición");
    expect(etiquetaEspecialidad("PSICOLOGIA")).toBe("Psicología");
    expect(etiquetaEspecialidad("KINESIOLOGIA")).toBe("Kinesiología");
  });

  it("arma el nombre como en el mockup", () => {
    expect(nombreProfesional({ nombre: "Valentina", apellido: "Méndez" })).toBe(
      "Lic. Valentina Méndez",
    );
  });

  it("formatea fecha y hora en horario de Buenos Aires", () => {
    const iso = "2026-10-21T16:30:00Z";
    expect(fechaLarga(iso)).toBe("Miércoles 21 de octubre");
    expect(horaCorta(iso)).toBe("13:30");
  });
});
