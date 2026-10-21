import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as feriadosApi from "../api/feriadosApi";
import type { Feriado } from "../types/turno";
import { useFeriados } from "./useFeriados";

vi.mock("../api/feriadosApi", () => ({ listarFeriados: vi.fn() }));

const navidad: Feriado = {
  fecha: "2026-12-25",
  descripcion: "Navidad",
  tipo: "INAMOVIBLE",
  cierraGimnasio: true,
  origen: "OFICIAL",
};

describe("useFeriados", () => {
  beforeEach(() => vi.mocked(feriadosApi.listarFeriados).mockReset());

  it("carga el año y resuelve el feriado de una fecha", async () => {
    vi.mocked(feriadosApi.listarFeriados).mockResolvedValue([navidad]);
    const { result } = renderHook(() => useFeriados(2026));
    expect(result.current.cargando).toBe(true);

    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(result.current.error).toBe(false);
    expect(result.current.feriadoDe("2026-12-25")).toEqual(navidad);
    expect(result.current.feriadoDe("2026-12-24")).toBeUndefined();
  });

  it("cachea por año: volver a un año ya pedido no repite el request", async () => {
    vi.mocked(feriadosApi.listarFeriados).mockResolvedValue([navidad]);
    const { result, rerender } = renderHook(({ anio }) => useFeriados(anio), {
      initialProps: { anio: 2026 },
    });
    await waitFor(() => expect(result.current.cargando).toBe(false));

    rerender({ anio: 2027 });
    await waitFor(() => expect(result.current.cargando).toBe(false));
    rerender({ anio: 2026 });
    await waitFor(() => expect(result.current.cargando).toBe(false));

    expect(feriadosApi.listarFeriados).toHaveBeenCalledTimes(2);
  });

  it("ante un error marca error y permite reintentar el año", async () => {
    vi.mocked(feriadosApi.listarFeriados).mockRejectedValueOnce(new Error("boom"));
    const { result, rerender } = renderHook(({ anio }) => useFeriados(anio), {
      initialProps: { anio: 2026 },
    });
    await waitFor(() => expect(result.current.error).toBe(true));
    expect(result.current.feriados).toEqual([]);

    vi.mocked(feriadosApi.listarFeriados).mockResolvedValue([navidad]);
    rerender({ anio: 2027 });
    await waitFor(() => expect(result.current.cargando).toBe(false));
    rerender({ anio: 2026 });
    await waitFor(() => expect(result.current.feriados).toEqual([navidad]));
  });
});
