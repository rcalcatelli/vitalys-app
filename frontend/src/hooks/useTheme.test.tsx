import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../context/ThemeContext";
import { useTheme } from "./useTheme";

// jsdom no implementa `matchMedia` (queda `undefined`), así que no se puede
// `vi.spyOn` un método inexistente — hay que stubearlo como global, igual que
// ya se hace con `fetch` en el resto de la suite.
function stubMatchMedia(matches: boolean): void {
  vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches } as MediaQueryList));
}

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

describe("useTheme", () => {
  beforeEach(() => {
    document.documentElement.removeAttribute("data-theme");
  });

  afterEach(() => {
    document.documentElement.removeAttribute("data-theme");
  });

  it("sin preferencia guardada ni de sistema, arranca en light y lo aplica a <html>", () => {
    stubMatchMedia(false);

    const { result } = renderHook(() => useTheme(), { wrapper });

    expect(result.current.theme).toBe("light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("sin matchMedia (jsdom) también cae en light", () => {
    const { result } = renderHook(() => useTheme(), { wrapper });

    expect(result.current.theme).toBe("light");
  });

  it("respeta prefers-color-scheme: dark cuando no hay nada guardado", () => {
    stubMatchMedia(true);

    const { result } = renderHook(() => useTheme(), { wrapper });

    expect(result.current.theme).toBe("dark");
  });

  it("toggleTheme alterna el tema, lo persiste en localStorage y lo aplica a <html>", () => {
    stubMatchMedia(false);

    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.theme).toBe("light");

    act(() => result.current.toggleTheme());

    expect(result.current.theme).toBe("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(localStorage.getItem("vitalys_theme")).toBe("dark");
  });

  it("una elección previa en localStorage tiene prioridad sobre prefers-color-scheme", () => {
    localStorage.setItem("vitalys_theme", "dark");
    stubMatchMedia(false);

    const { result } = renderHook(() => useTheme(), { wrapper });

    expect(result.current.theme).toBe("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("falla con un mensaje claro fuera del ThemeProvider", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(() => renderHook(() => useTheme())).toThrow("useTheme debe usarse dentro");
  });
});
