import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "../api/notificacionesApi";
import { unaNotificacion } from "../test/notificacionFixture";
import { useFallidas } from "./useFallidas";

vi.mock("../api/notificacionesApi", () => ({ listarFallidas: vi.fn() }));

describe("useFallidas", () => {
  beforeEach(() => {
    vi.mocked(api.listarFallidas).mockReset();
  });

  it("devuelve la lista de fallidas", async () => {
    vi.mocked(api.listarFallidas).mockResolvedValue([
      unaNotificacion(),
      unaNotificacion({ id: 2 }),
    ]);
    const { result } = renderHook(() => useFallidas(false));
    expect(result.current.lista).toBeNull();
    await waitFor(() => expect(result.current.lista).toHaveLength(2));
    expect(result.current.error).toBe(false);
  });

  it("no consulta si se omite", () => {
    const { result } = renderHook(() => useFallidas(true));
    expect(result.current).toEqual({ lista: null, error: false });
    expect(api.listarFallidas).not.toHaveBeenCalled();
  });

  it("ante un error marca error y deja la lista en null", async () => {
    vi.mocked(api.listarFallidas).mockRejectedValue(new Error("boom"));
    const { result } = renderHook(() => useFallidas(false));
    await waitFor(() => expect(result.current.error).toBe(true));
    expect(result.current.lista).toBeNull();
  });

  it("ignora la respuesta si se desmonta antes", async () => {
    let resolver: (v: never[]) => void = () => undefined;
    vi.mocked(api.listarFallidas).mockReturnValue(new Promise((r) => (resolver = r)));
    const { unmount } = renderHook(() => useFallidas(false));
    unmount();
    resolver([]);
    await Promise.resolve();
  });

  it("ignora el error si se desmonta antes", async () => {
    let rechazar: (e: Error) => void = () => undefined;
    vi.mocked(api.listarFallidas).mockReturnValue(new Promise((_, r) => (rechazar = r)));
    const { unmount } = renderHook(() => useFallidas(false));
    unmount();
    rechazar(new Error("tarde"));
    await Promise.resolve();
  });
});
