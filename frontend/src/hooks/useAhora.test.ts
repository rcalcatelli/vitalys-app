import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAhora } from "./useAhora";

describe("useAhora", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-26T13:00:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("devuelve la hora actual y se refresca cada intervalo", () => {
    const { result } = renderHook(() => useAhora(30_000));
    expect(result.current.toISOString()).toBe("2026-10-26T13:00:00.000Z");

    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    expect(result.current.toISOString()).toBe("2026-10-26T13:00:30.000Z");
  });

  it("usa 30 s por defecto y limpia el intervalo al desmontar", () => {
    const { result, unmount } = renderHook(() => useAhora());
    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    expect(result.current.toISOString()).toBe("2026-10-26T13:00:30.000Z");
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
