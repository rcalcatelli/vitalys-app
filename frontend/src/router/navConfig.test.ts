import { describe, expect, it } from "vitest";
import { ETIQUETAS_ROL, NAV_POR_ROL } from "./navConfig";

const etiquetas = (rol: keyof typeof NAV_POR_ROL) => NAV_POR_ROL[rol].map((i) => i.etiqueta);

describe("navConfig", () => {
  it("el socio ve Inicio, gimnasio, consultorio, turnos y estado de cuenta", () => {
    expect(etiquetas("SOCIO_PACIENTE")).toEqual([
      "Inicio",
      "Reservar gimnasio",
      "Turno de consultorio",
      "Mis turnos",
      "Estado de cuenta",
    ]);
  });

  it("el profesional ve agenda y disponibilidad", () => {
    expect(etiquetas("PROFESIONAL")).toEqual(["Agenda de hoy", "Disponibilidad"]);
  });

  it("recepción ve las cinco pantallas, sin 'Pagos y cuotas', y solo Hoy lleva badge", () => {
    expect(etiquetas("ADMIN")).toEqual([
      "Hoy en el centro",
      "Ingreso al gimnasio",
      "Personas",
      "Profesionales",
      "Pagos",
    ]);
    expect(NAV_POR_ROL.ADMIN.filter((i) => i.conBadge).map((i) => i.to)).toEqual(["/admin/hoy"]);
  });

  it("gimnasio es naranja y consultorio teal", () => {
    const socio = NAV_POR_ROL.SOCIO_PACIENTE;
    expect(socio.find((i) => i.corta === "Gimnasio")?.tono).toBe("gym");
    expect(socio.find((i) => i.corta === "Consulta")?.tono).toBe("clin");
  });

  it("cada rol tiene sus etiquetas", () => {
    expect(ETIQUETAS_ROL.ADMIN.corta).toBe("Recepción");
    expect(ETIQUETAS_ROL.SOCIO_PACIENTE.corta).toBe("Socio/a");
    expect(ETIQUETAS_ROL.PROFESIONAL.encabezado).toBe("Profesional");
  });
});
