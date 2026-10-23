import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useCarga } from "./useCarga";

describe("useCarga", () => {
  it("expone los datos al resolver y vuelve a consultar con recargar", async () => {
    const consulta = vi.fn().mockResolvedValueOnce("uno").mockResolvedValueOnce("dos");
    const { result } = renderHook(() => useCarga(consulta));
    expect(result.current.datos).toBeNull();
    await waitFor(() => expect(result.current.datos).toBe("uno"));
    act(() => result.current.recargar());
    await waitFor(() => expect(result.current.datos).toBe("dos"));
    expect(consulta).toHaveBeenCalledTimes(2);
  });

  it("expone el mensaje del error y se recupera al reintentar", async () => {
    const consulta = vi.fn().mockRejectedValueOnce(new Error("boom")).mockResolvedValueOnce("ok");
    const { result } = renderHook(() => useCarga(consulta));
    await waitFor(() => expect(result.current.error).toEqual(expect.any(String)));
    expect(result.current.datos).toBeNull();
    act(() => result.current.recargar());
    await waitFor(() => expect(result.current.datos).toBe("ok"));
    expect(result.current.error).toBeNull();
  });
});
