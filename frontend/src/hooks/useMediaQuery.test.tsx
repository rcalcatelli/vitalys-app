import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useMediaQuery } from "./useMediaQuery";

function stubMatchMedia(matches: boolean) {
  const oyentes = new Set<() => void>();
  const lista = {
    matches,
    addEventListener: (_: string, fn: () => void) => oyentes.add(fn),
    removeEventListener: (_: string, fn: () => void) => oyentes.delete(fn),
  };
  vi.stubGlobal("matchMedia", vi.fn().mockReturnValue(lista));
  return {
    cambiar(nuevo: boolean) {
      lista.matches = nuevo;
      oyentes.forEach((fn) => fn());
    },
    oyentes,
  };
}

describe("useMediaQuery", () => {
  it("sin matchMedia (jsdom) devuelve false", () => {
    const { result } = renderHook(() => useMediaQuery("(max-width: 759px)"));
    expect(result.current).toBe(false);
  });

  it("refleja la media query y reacciona a los cambios", () => {
    const mq = stubMatchMedia(true);
    const { result, unmount } = renderHook(() => useMediaQuery("(max-width: 759px)"));
    expect(result.current).toBe(true);

    act(() => mq.cambiar(false));
    expect(result.current).toBe(false);

    unmount();
    expect(mq.oyentes.size).toBe(0);
  });
});
