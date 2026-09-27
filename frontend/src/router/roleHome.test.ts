import { describe, expect, it } from "vitest";
import type { RolUsuario } from "../types/auth";
import { homePathForRol } from "./roleHome";

describe("homePathForRol", () => {
  it.each<[RolUsuario, string]>([
    ["ADMIN", "/admin/dashboard"],
    ["PROFESIONAL", "/profesional/agenda"],
    ["SOCIO_PACIENTE", "/socio/turnos"],
  ])("mapea %s a %s", (rol, path) => {
    expect(homePathForRol(rol)).toBe(path);
  });
});
