import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "../api/notificacionesApi";
import { unaNotificacion } from "../test/notificacionFixture";
import { useConteoFallidas } from "./useConteoFallidas";

vi.mock("../api/notificacionesApi", () => ({ listarFallidas: vi.fn() }));

describe("useConteoFallidas", () => {
  beforeEach(() => {
    vi.mocked(api.listarFallidas).mockReset();
  });

  it("devuelve la cantidad de fallidas", async () => {
    vi.mocked(api.listarFallidas).mockResolvedValue([
      unaNotificacion(),
      unaNotificacion({ id: 2 }),
    ]);
    const { result } = renderHook(() => useConteoFallidas(false));
    await waitFor(() => expect(result.current).toBe(2));
  });

  it("no consulta si se omite", () => {
    const { result } = renderHook(() => useConteoFallidas(true));
    expect(result.current).toBe(0);
    expect(api.listarFallidas).not.toHaveBeenCalled();
  });

  it("ante un error queda en 0", async () => {
    vi.mocked(api.listarFallidas).mockRejectedValue(new Error("boom"));
    const { result } = renderHook(() => useConteoFallidas(false));
    await waitFor(() => expect(api.listarFallidas).toHaveBeenCalled());
    expect(result.current).toBe(0);
  });

  it("ignora la respuesta si se desmonta antes", async () => {
    let resolver: (v: never[]) => void = () => undefined;
    vi.mocked(api.listarFallidas).mockReturnValue(new Promise((r) => (resolver = r)));
    const { unmount } = renderHook(() => useConteoFallidas(false));
    unmount();
    resolver([]);
    await Promise.resolve();
  });
});
