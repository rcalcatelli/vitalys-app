import { describe, expect, it } from "vitest";
import { unTurnoGym } from "../test/turnoFixture";
import { unaFranjaGym } from "../test/turnoFixture";
import {
  coincideBusqueda,
  franjaDeIngreso,
  franjaIniciada,
  ordenarIngresos,
  turnosDeFranja,
} from "./ingresoUi";

const DIA = "2026-10-26";
const FRANJAS = [unaFranjaGym(DIA, 9), unaFranjaGym(DIA, 10), unaFranjaGym(DIA, 11)];
const a = (hhmm: string) => new Date(`${DIA}T${hhmm}:00-03:00`);

describe("franjaDeIngreso", () => {
  it("elige la franja en curso", () => {
    expect(franjaDeIngreso(FRANJAS, a("10:20"))?.inicio).toContain("T10:00");
  });

  it("antes de que empiece, solo desde 15 minutos antes del inicio", () => {
    expect(franjaDeIngreso([FRANJAS[1]], a("09:44"))).toBeNull();
    expect(franjaDeIngreso([FRANJAS[1]], a("09:45"))?.inicio).toContain("T10:00");
  });

  it("en el cambio de franja sigue mostrando la que está en curso", () => {
    expect(franjaDeIngreso(FRANJAS, a("10:50"))?.inicio).toContain("T10:00");
  });

  it("sin franjas o fuera de horario no hay nada que atender", () => {
    expect(franjaDeIngreso([], a("10:20"))).toBeNull();
    expect(franjaDeIngreso(FRANJAS, a("13:00"))).toBeNull();
  });

  it("distingue la franja iniciada de la próxima", () => {
    expect(franjaIniciada(FRANJAS[1], a("10:00"))).toBe(true);
    expect(franjaIniciada(FRANJAS[1], a("09:50"))).toBe(false);
  });
});

describe("turnosDeFranja / ordenarIngresos", () => {
  const turnos = [
    unTurnoGym({ id: 1, inicio: `${DIA}T10:00:00-03:00` }),
    unTurnoGym({ id: 2, inicio: `${DIA}T10:00:00-03:00`, estado: "CANCELADO_TARDE" }),
    unTurnoGym({ id: 3, inicio: `${DIA}T11:00:00-03:00` }),
    unTurnoGym({
      id: 4,
      inicio: `${DIA}T10:00:00-03:00`,
      estado: "COMPLETADO",
      completadoEn: `${DIA}T10:09:00-03:00`,
    }),
    unTurnoGym({
      id: 5,
      inicio: `${DIA}T10:00:00-03:00`,
      estado: "COMPLETADO",
      completadoEn: `${DIA}T10:02:00-03:00`,
    }),
    unTurnoGym({
      id: 6,
      inicio: `${DIA}T10:00:00-03:00`,
      estado: "COMPLETADO",
      completadoEn: null,
    }),
  ];

  it("deja los de la franja y descarta cancelados y de otra hora", () => {
    expect(turnosDeFranja(turnos, FRANJAS[1]).map((t) => t.id)).toEqual([1, 4, 5, 6]);
  });

  it("deja los consultorios afuera", () => {
    const consultorio = { ...turnos[0], id: 9, tipoTurno: "CONSULTORIO" as const };
    expect(turnosDeFranja([consultorio], FRANJAS[1])).toEqual([]);
  });

  it("pendientes primero y luego los ingresados por hora (sin hora, al principio de ellos)", () => {
    const orden = ordenarIngresos(turnosDeFranja(turnos, FRANJAS[1])).map((t) => t.id);
    expect(orden).toEqual([1, 6, 5, 4]);
  });
});

describe("coincideBusqueda", () => {
  const turno = unTurnoGym({
    personaNombre: "Agustín",
    personaApellido: "Ríos",
    personaDni: "42567001",
  });

  it("sin texto coincide siempre", () => {
    expect(coincideBusqueda(turno, "  ")).toBe(true);
  });

  it("por nombre o apellido, sin importar tildes ni mayúsculas", () => {
    expect(coincideBusqueda(turno, "agustin")).toBe(true);
    expect(coincideBusqueda(turno, "RIOS")).toBe(true);
    expect(coincideBusqueda(turno, "rios agu")).toBe(true);
    expect(coincideBusqueda(turno, "pedro")).toBe(false);
  });

  it("por DNI parcial", () => {
    expect(coincideBusqueda(turno, "5670")).toBe(true);
    expect(coincideBusqueda(turno, "999")).toBe(false);
  });

  it("un turno sin DNI no coincide por número", () => {
    expect(coincideBusqueda({ ...turno, personaDni: undefined }, "123")).toBe(false);
  });
});
