import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as profesionalesApi from "../api/profesionalesApi";
import * as turnosApi from "../api/turnosApi";
import { unProfesional } from "../test/profesionalFixture";
import { unEstadoGym, unTurno } from "../test/turnoFixture";
import { useServiciosSocio } from "./useServiciosSocio";

vi.mock("../api/profesionalesApi", () => ({ listarProfesionales: vi.fn() }));
vi.mock("../api/turnosApi", () => ({ estadoGym: vi.fn(), misTurnos: vi.fn() }));

afterEach(() => vi.clearAllMocks());

describe("useServiciosSocio", () => {
  it("arma 'Gimnasio + Nutrición' con el gimnasio y las especialidades usadas", async () => {
    vi.mocked(turnosApi.estadoGym).mockResolvedValue(unEstadoGym());
    vi.mocked(turnosApi.misTurnos).mockResolvedValue([
      unTurno({ profesionalId: 1 }),
      unTurno({ id: 2, profesionalId: 2, estado: "CANCELADO_EN_TIEMPO" }),
    ]);
    vi.mocked(profesionalesApi.listarProfesionales).mockResolvedValue([
      unProfesional(),
      unProfesional({ id: 2, especialidad: "PSICOLOGIA" }),
    ]);
    const { result } = renderHook(() => useServiciosSocio(false));
    await waitFor(() => expect(result.current).toBe("Gimnasio + Nutrición"));
  });

  it("sin gimnasio y sin turnos devuelve null", async () => {
    vi.mocked(turnosApi.estadoGym).mockResolvedValue(unEstadoGym({ esSocioGym: false }));
    vi.mocked(turnosApi.misTurnos).mockResolvedValue([]);
    vi.mocked(profesionalesApi.listarProfesionales).mockResolvedValue([]);
    const { result } = renderHook(() => useServiciosSocio(false));
    await waitFor(() => expect(turnosApi.misTurnos).toHaveBeenCalled());
    expect(result.current).toBeNull();
  });

  it("si fallan las consultas de turnos usa solo el gimnasio", async () => {
    vi.mocked(turnosApi.estadoGym).mockResolvedValue(unEstadoGym());
    vi.mocked(turnosApi.misTurnos).mockRejectedValue(new Error("x"));
    vi.mocked(profesionalesApi.listarProfesionales).mockResolvedValue([]);
    const { result } = renderHook(() => useServiciosSocio(false));
    await waitFor(() => expect(result.current).toBe("Gimnasio"));
  });

  it("omitido no consulta", () => {
    renderHook(() => useServiciosSocio(true));
    expect(turnosApi.estadoGym).not.toHaveBeenCalled();
  });
});
