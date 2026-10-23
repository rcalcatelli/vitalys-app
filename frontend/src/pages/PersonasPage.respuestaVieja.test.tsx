import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { http } from "../api/http";
import { renderWithRouter } from "../test/renderWithRouter";
import { PersonasPage } from "./PersonasPage";

// Respuesta de un backend desplegado antes de agregar `cuota`, `especialidades` y `tieneUsuarioSocio`.
const respuestaVieja = [
  {
    id: 1,
    usuarioId: 11,
    email: "juan.garcia@mail.com",
    nombre: "Juan",
    apellido: "García",
    dni: "38100002",
    telefono: "11-2002-0002",
    fechaNacimiento: "1990-07-22",
    estado: "ACTIVO",
    esSocioGym: true,
    fechaInicioMembresia: "2026-01-01",
    fechaAlta: "2023-05-15",
    fechaBaja: null,
  },
  {
    id: 2,
    usuarioId: 12,
    email: "ana@mail.com",
    nombre: "Ana",
    apellido: "López",
    dni: "40000001",
    telefono: null,
    fechaNacimiento: null,
    estado: "ACTIVO",
    esSocioGym: false,
    fechaInicioMembresia: null,
    fechaAlta: "2024-01-10",
    fechaBaja: null,
  },
];

describe("PersonasPage con la respuesta del backend viejo", () => {
  afterEach(() => vi.restoreAllMocks());

  it("dibuja las filas aunque falten los campos nuevos", async () => {
    vi.spyOn(http, "get").mockResolvedValue(respuestaVieja);
    renderWithRouter(<PersonasPage />);

    expect(await screen.findByText("Juan García")).toBeInTheDocument();
    expect(screen.getByText("Ana López")).toBeInTheDocument();
    expect(screen.getAllByText("Sin cuota de gym").length).toBeGreaterThan(0);
  });
});
